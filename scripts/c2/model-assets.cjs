/* Install the exact trained browser exports, online or from an offline ZIP. */
const fs = require('node:fs/promises');
const { createReadStream, createWriteStream } = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { createHash } = require('node:crypto');
const { pipeline } = require('node:stream/promises');
const { Readable } = require('node:stream');
const { spawnSync } = require('node:child_process');
const manifest = require('../../ml/c2/browser-assets-manifest.json');
const ROOT = path.resolve(__dirname, '../..');

async function sha256(file) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest('hex');
}
function safeFile(root, relative) {
  if (!relative.startsWith('public/c2/transformer/') || relative.split('/').some(part => part === '..')) throw new Error('Invalid model asset path');
  const target = path.resolve(root, relative);
  if (!target.startsWith(path.resolve(root) + path.sep)) throw new Error('Model path leaves its install directory');
  return target;
}
async function verify(root) {
  const errors = [];
  for (const row of manifest.files) {
    try {
      const file = safeFile(root, row.path);
      const stat = await fs.lstat(file);
      if (!stat.isFile() || stat.size !== row.bytes || await sha256(file) !== row.sha256) errors.push(row.path);
    } catch { errors.push(row.path); }
  }
  if (errors.length) throw new Error(`Missing or mismatched model files (${errors.length}):\n${errors.join('\n')}\nRun npm run c2:models:download, or install the offline ZIP.`);
  console.log(`Verified ${manifest.files.length} trained model/tokenizer/runtime files with SHA-256.`);
}
async function main() {
  const [action, archiveArg] = process.argv.slice(2);
  if (action === 'verify') return verify(ROOT);
  if (!['download', 'install'].includes(action)) throw new Error('Use verify, download, or install <path-to-zip>.');
  if (action === 'download' && manifest.distribution?.publicReleasePublished === false) throw new Error('No public model Release has been approved or published. Obtain the matching private ZIP from the project owner, then run c2:models:install with its path.');
  if (action === 'install' && !archiveArg) throw new Error(`Provide the ZIP path: npm run c2:models:install -- "D:/Downloads/${manifest.archive.name}"`);
  const tempBase = path.resolve(os.tmpdir());
  const temp = await fs.mkdtemp(path.join(tempBase, 'unicare-c2-models-'));
  try {
    let archive = archiveArg ? path.resolve(archiveArg) : path.join(temp, manifest.archive.name);
    if (action === 'download') {
      console.log(`Downloading the trained model bundle (${Math.round(manifest.archive.bytes / 1024 / 1024)} MiB). No training required.`);
      const response = await fetch(manifest.archive.url);
      if (!response.ok || !response.body) throw new Error(`Model download failed (HTTP ${response.status}). Use the Release download or offline ZIP instead.`);
      await pipeline(Readable.fromWeb(response.body), createWriteStream(archive, { flags: 'wx' }));
    }
    if ((await fs.stat(archive)).size !== manifest.archive.bytes || await sha256(archive) !== manifest.archive.sha256) throw new Error('Archive checksum mismatch; installation stopped.');
    const staging = path.join(temp, 'verified');
    await fs.mkdir(staging);
    const command = process.platform === 'win32' ? 'tar' : 'unzip';
    const args = process.platform === 'win32' ? ['-xf', archive, '-C', staging] : ['-q', archive, '-d', staging];
    const extracted = spawnSync(command, args, { encoding: 'utf8', windowsHide: true });
    if (extracted.error || extracted.status !== 0) throw new Error('Could not extract the ZIP. Windows requires tar; macOS/Linux require unzip.');
    await verify(staging);
    for (const row of manifest.files) {
      const destination = safeFile(ROOT, row.path);
      // Reject symlink parents so a checkout cannot redirect model installation.
      let parent = path.dirname(destination);
      while (parent !== ROOT) {
        try { if ((await fs.lstat(parent)).isSymbolicLink()) throw new Error('Model install path contains a symbolic link'); }
        catch (error) { if (error.code !== 'ENOENT') throw error; }
        parent = path.dirname(parent);
      }
      try { if ((await fs.lstat(destination)).isSymbolicLink()) throw new Error('Model destination is a symbolic link'); }
      catch (error) { if (error.code !== 'ENOENT') throw error; }
      await fs.mkdir(path.dirname(destination), { recursive: true });
      await fs.copyFile(safeFile(staging, row.path), destination);
    }
    await verify(ROOT);
    console.log('Installed the original trained browser exports. Start the site with npm run dev.');
  } finally {
    if (path.dirname(temp) === tempBase && path.basename(temp).startsWith('unicare-c2-models-')) await fs.rm(temp, { recursive: true, force: true });
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
