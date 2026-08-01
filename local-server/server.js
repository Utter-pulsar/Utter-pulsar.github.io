const http = require("node:http");
const { createReadStream } = require("node:fs");
const { stat } = require("node:fs/promises");
const { networkInterfaces } = require("node:os");
const path = require("node:path");

const SERVER_DIRECTORY = __dirname;
const PROJECT_ROOT = path.resolve(SERVER_DIRECTORY, "..");

const MIME_TYPES = new Map([
  [".css", "text/css; charset=utf-8"],
  [".gif", "image/gif"],
  [".htm", "text/html; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".jpeg", "image/jpeg"],
  [".jpg", "image/jpeg"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".map", "application/json; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
  [".mp4", "video/mp4"],
  [".pdf", "application/pdf"],
  [".png", "image/png"],
  [".svg", "image/svg+xml; charset=utf-8"],
  [".ttf", "font/ttf"],
  [".txt", "text/plain; charset=utf-8"],
  [".webm", "video/webm"],
  [".webp", "image/webp"],
  [".woff", "font/woff"],
  [".woff2", "font/woff2"],
  [".xml", "application/xml; charset=utf-8"]
]);

function printUsage() {
  console.log(`Usage: node server.js [options]

Options:
  --host <host>  Host to bind to (default: 0.0.0.0)
  --port <port>  Port to listen on (default: 8080, or PORT environment variable)
  --help         Show this help message`);
}

function readArguments(argv) {
  const options = {
    host: "0.0.0.0",
    port: process.env.PORT || "8080"
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === "--help") {
      printUsage();
      process.exit(0);
    }

    if (argument === "--host" || argument === "--port") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error(`Missing value for ${argument}`);
      }

      options[argument.slice(2)] = value;
      index += 1;
      continue;
    }

    throw new Error(`Unknown option: ${argument}`);
  }

  const port = Number(options.port);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid port: ${options.port}`);
  }

  return { host: options.host, port };
}

function sendText(response, statusCode, message, extraHeaders = {}) {
  const body = `${message}\n`;
  response.writeHead(statusCode, {
    "Cache-Control": "no-store",
    "Content-Length": Buffer.byteLength(body),
    "Content-Type": "text/plain; charset=utf-8",
    "X-Content-Type-Options": "nosniff",
    ...extraHeaders
  });
  response.end(body);
}

function isInside(parentDirectory, candidatePath) {
  const relativePath = path.relative(parentDirectory, candidatePath);
  return relativePath === "" || (
    !relativePath.startsWith(`..${path.sep}`) &&
    relativePath !== ".." &&
    !path.isAbsolute(relativePath)
  );
}

function parseRange(rangeHeader, fileSize) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader || "");
  if (!match || (!match[1] && !match[2])) {
    return null;
  }

  let start;
  let end;

  if (!match[1]) {
    const suffixLength = Number(match[2]);
    if (!Number.isInteger(suffixLength) || suffixLength <= 0) {
      return null;
    }
    start = Math.max(fileSize - suffixLength, 0);
    end = fileSize - 1;
  } else {
    start = Number(match[1]);
    end = match[2] ? Number(match[2]) : fileSize - 1;
  }

  if (
    !Number.isInteger(start) ||
    !Number.isInteger(end) ||
    start < 0 ||
    start >= fileSize ||
    end < start
  ) {
    return null;
  }

  return { start, end: Math.min(end, fileSize - 1) };
}

async function resolveRequestPath(pathname) {
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(pathname);
  } catch {
    return { error: 400 };
  }

  if (decodedPath.includes("\0")) {
    return { error: 400 };
  }

  const relativePath = decodedPath.replace(/^[/\\]+/, "");
  let filePath = path.resolve(PROJECT_ROOT, relativePath);

  if (!isInside(PROJECT_ROOT, filePath) || isInside(SERVER_DIRECTORY, filePath)) {
    return { error: 404 };
  }

  let fileStats;
  try {
    fileStats = await stat(filePath);
  } catch (error) {
    if (error.code === "ENOENT" || error.code === "ENOTDIR") {
      return { error: 404 };
    }
    throw error;
  }

  if (fileStats.isDirectory()) {
    if (!decodedPath.endsWith("/")) {
      return { redirect: `${decodedPath}/` };
    }

    filePath = path.join(filePath, "index.html");
    try {
      fileStats = await stat(filePath);
    } catch (error) {
      if (error.code === "ENOENT" || error.code === "ENOTDIR") {
        return { error: 404 };
      }
      throw error;
    }
  }

  if (!fileStats.isFile()) {
    return { error: 404 };
  }

  return { filePath, fileStats };
}

async function handleRequest(request, response) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    sendText(response, 405, "Method Not Allowed", { Allow: "GET, HEAD" });
    return;
  }

  let requestUrl;
  try {
    requestUrl = new URL(request.url, "http://localhost");
  } catch {
    sendText(response, 400, "Bad Request");
    return;
  }

  const result = await resolveRequestPath(requestUrl.pathname);

  if (result.redirect) {
    response.writeHead(308, {
      "Cache-Control": "no-store",
      Location: `${result.redirect}${requestUrl.search}`
    });
    response.end();
    return;
  }

  if (result.error) {
    sendText(response, result.error, result.error === 400 ? "Bad Request" : "Not Found");
    return;
  }

  const { filePath, fileStats } = result;
  const contentType = MIME_TYPES.get(path.extname(filePath).toLowerCase()) || "application/octet-stream";
  const headers = {
    "Accept-Ranges": "bytes",
    "Cache-Control": "no-store",
    "Content-Type": contentType,
    "X-Content-Type-Options": "nosniff"
  };

  let statusCode = 200;
  let streamOptions;
  const rangeHeader = request.headers.range;

  if (rangeHeader) {
    const range = parseRange(rangeHeader, fileStats.size);
    if (!range) {
      sendText(response, 416, "Range Not Satisfiable", {
        "Content-Range": `bytes */${fileStats.size}`
      });
      return;
    }

    statusCode = 206;
    headers["Content-Length"] = range.end - range.start + 1;
    headers["Content-Range"] = `bytes ${range.start}-${range.end}/${fileStats.size}`;
    streamOptions = range;
  } else {
    headers["Content-Length"] = fileStats.size;
  }

  response.writeHead(statusCode, headers);
  if (request.method === "HEAD") {
    response.end();
    return;
  }

  const fileStream = createReadStream(filePath, streamOptions);
  fileStream.on("error", (error) => {
    console.error(`Failed to read ${filePath}:`, error.message);
    response.destroy(error);
  });
  fileStream.pipe(response);
}

let options;
try {
  options = readArguments(process.argv.slice(2));
} catch (error) {
  console.error(error.message);
  printUsage();
  process.exit(1);
}

const server = http.createServer((request, response) => {
  handleRequest(request, response).catch((error) => {
    console.error(error);
    if (!response.headersSent) {
      sendText(response, 500, "Internal Server Error");
    } else {
      response.destroy(error);
    }
  });
});

function getLocalNetworkAddresses() {
  const addresses = new Set();

  for (const interfaces of Object.values(networkInterfaces())) {
    for (const network of interfaces || []) {
      if (network.family === "IPv4" && !network.internal) {
        addresses.add(network.address);
      }
    }
  }

  return [...addresses];
}

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`Port ${options.port} is already in use.`);
  } else {
    console.error(error);
  }
  process.exit(1);
});

server.listen(options.port, options.host, () => {
  console.log(`Local:   http://localhost:${options.port}/`);

  if (options.host === "0.0.0.0") {
    const addresses = getLocalNetworkAddresses();
    if (addresses.length === 0) {
      console.log(`Network: http://<your-lan-ip>:${options.port}/`);
    } else {
      for (const address of addresses) {
        console.log(`Network: http://${address}:${options.port}/`);
      }
    }
  } else {
    console.log(`Bound to: http://${options.host}:${options.port}/`);
  }

  console.log(`Serving project files from ${PROJECT_ROOT}`);
  console.log("Press Ctrl+C to stop.");
});

function shutDown() {
  server.close(() => process.exit(0));
}

process.on("SIGINT", shutDown);
process.on("SIGTERM", shutDown);
