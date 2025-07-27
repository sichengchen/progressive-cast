#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

function getVersion() {
    if (process.env.NODE_ENV !== "development") {
        return `dev-${Date.now()}`;
    }

    try {
        // Get package.json version
        const packagePath = path.join(__dirname, "..", "package.json");
        const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));
        const version = packageJson.version;

        // Get current commit hash (short)
        const commitHash = execSync("git rev-parse --short HEAD", {
            encoding: "utf8",
        }).trim();

        return `${version}-${commitHash}`;
    } catch (error) {
        console.warn("Could not determine version+commit, using fallback");
        return `dev-${Date.now()}`;
    }
}

function setEnvironmentVariables() {
    try {
        const packagePath = path.join(__dirname, "..", "package.json");
        const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));

        // Set environment variable for Next.js
        process.env.NEXT_PUBLIC_APP_VERSION = packageJson.version;

        console.log(`Set NEXT_PUBLIC_APP_VERSION=${packageJson.version}`);
    } catch (error) {
        console.warn("Could not set environment variables:", error);
    }
}

function updateServiceWorker() {
    const swTemplatePath = path.join(__dirname, "..", "src", "sw-template.js");
    const swOutputPath = path.join(__dirname, "..", "public", "sw.js");
    const version = getVersion();

    console.log(`Building Service Worker with version: ${version}`);

    // Check if template exists, if not copy from current sw.js
    if (!fs.existsSync(swTemplatePath)) {
        console.log("Creating SW template from existing sw.js...");
        if (fs.existsSync(swOutputPath)) {
            let content = fs.readFileSync(swOutputPath, "utf8");
            // Replace any existing version with placeholder
            content = content.replace(
                /const VERSION = isDev \? `dev-\${Date\.now\(\)}` : '[^']*';/,
                "const VERSION = isDev ? `dev-${Date.now()}` : '__VERSION_PLACEHOLDER__';"
            );
            fs.writeFileSync(swTemplatePath, content);
            console.log("SW template created at:", swTemplatePath);
        } else {
            console.error("Neither template nor existing SW found");
            process.exit(1);
        }
    }

    let swContent = fs.readFileSync(swTemplatePath, "utf8");

    // Replace version placeholder
    swContent = swContent.replace("__VERSION_PLACEHOLDER__", version);

    // Write to public directory
    fs.writeFileSync(swOutputPath, swContent);

    console.log("Service Worker built successfully");
}

// Set environment variables first
setEnvironmentVariables();

updateServiceWorker();
