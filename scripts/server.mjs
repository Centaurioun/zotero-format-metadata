import { main as build, esbuildOptions } from "./build.mjs";
import { openDevToolScript, reloadScript } from "./scripts.mjs";
import { main as startZotero } from "./start.mjs";
import { Logger } from "./utils.mjs";
import cmd from "./zotero-cmd.json" assert { type: "json" };
import { execSync } from "child_process";
import chokidar from "chokidar";
import { context } from "esbuild";
import { exit } from "process";

process.env.NODE_ENV = "development";

const { zoteroBinPath, profilePath } = cmd.exec;

const startZoteroCmd = `"${zoteroBinPath}" --debugger --purgecaches -profile "${profilePath}"`;

async function watch() {
    const watcher = chokidar.watch(["src/**", "addon/**"], {
        ignored: /(^|[\/\\])\../, // ignore dotfiles
        persistent: true,
    });

    const esbuildCTX = await context(esbuildOptions);
    let currentTimeout = null;

    watcher
        .on("ready", () => {
            Logger.info("Server Ready! \n");
        })
        .on("change", async (path) => {
            Logger.info(`${path} changed at ${new Date().toLocaleTimeString()}`);

            async function rebuild() {
                if (path.startsWith("src")) {
                    await esbuildCTX.rebuild();
                } else if (path.startsWith("addon")) {
                    await build();
                }
            }

            // debounced, see https://github.com/samhuk/chokidar-debounced/blob/master/index.ts
            clearTimeout(currentTimeout);
            currentTimeout = setTimeout(async () => {
                await rebuild()
                    .then(() => {
                        reload();
                    })
                    // Do not abort the watcher when errors occur in builds triggered by the watcher.
                    .catch((err) => {
                        Logger.error(err);
                    });
            }, 1000);
        })
        .on("error", (err) => {
            Logger.error("Server start failed!", err);
        });
}

function reload() {
    Logger.debug("Reloading...");
    const url = `zotero://ztoolkit-debug/?run=${encodeURIComponent(reloadScript)}`;
    const command = `${startZoteroCmd} -url "${url}"`;
    execSync(command, { timeout: 8000 });
}

function openDevTool() {
    Logger.debug("Open dev tools...");
    const url = `zotero://ztoolkit-debug/?run=${encodeURIComponent(openDevToolScript)}`;
    const command = `${startZoteroCmd} -url "${url}"`;
    execSync(command);
}

async function main() {
    // build
    await build();

    // start Zotero
    startZotero();
    setTimeout(() => {
        openDevTool();
    }, 3000);

    // watch
    await watch();
}

main().catch((err) => {
    Logger.error(err);
    // execSync("node scripts/stop.mjs");
    exit(1);
});

process.on("SIGINT", (code) => {
    execSync("node scripts/stop.mjs");
    Logger.info(`Server terminated with signal ${code}.`);
    exit(0);
});
