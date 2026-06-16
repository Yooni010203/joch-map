const http = require('http');
const fs   = require('fs');
const path = require('path');

const PORT     = process.env.PORT || 8080;
const ROOT     = __dirname;
const ROOM_DIR   = path.join(ROOT, 'room');
const BACKUP_DIR = path.join(ROOT, 'backup');

[1,2,3,4].forEach(f => {
  const fm = require('path').join(ROOT, 'flr_marker', String(f));
  if (!require('fs').existsSync(fm)) require('fs').mkdirSync(fm, { recursive: true });
  const mk = require('path').join(ROOT, 'marker', String(f));
  if (!require('fs').existsSync(mk)) require('fs').mkdirSync(mk, { recursive: true });
  const pth = path.join(ROOT, 'line', String(f));
  if (!fs.existsSync(pth)) fs.mkdirSync(pth, { recursive: true });
  const d = path.join(ROOM_DIR, String(f));
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  const b = path.join(BACKUP_DIR, String(f));
  if (!fs.existsSync(b)) fs.mkdirSync(b, { recursive: true });
});

const MIME = {
  '.html':'text/html', '.js':'application/javascript',
  '.css':'text/css', '.glb':'model/gltf-binary',
  '.png':'image/png', '.jpg':'image/jpeg',
  '.ico':'image/x-icon', '':'text/plain',
};

function res404(res) { res.writeHead(404); res.end('Not Found'); }
function resJSON(res, data) {
  res.writeHead(200, {'Content-Type':'application/json','Access-Control-Allow-Origin':'*'});
  res.end(JSON.stringify(data));
}
function safeRoomPath(floor, name) {
  const dir = path.join(ROOM_DIR, String(parseInt(floor)));
  if (!fs.existsSync(dir)) return null;
  const fp = path.join(dir, decodeURIComponent(name));
  return fp.startsWith(dir) ? fp : null;
}
function safeBackupPath(floor, name) {
  const dir = path.join(BACKUP_DIR, String(parseInt(floor)));
  if (!fs.existsSync(dir)) return null;
  const fp = path.join(dir, decodeURIComponent(name));
  return fp.startsWith(dir) ? fp : null;
}

http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const url = new URL(req.url, 'http://localhost');
  const p   = url.pathname;

  // 루트 접속 시 Joch_Map.html로 리다이렉트
  if (p === '/') {
    res.writeHead(302, { Location: '/Joch_Map.html' });
    res.end(); return;
  }

  const roomsMatch = p.match(/^\/api\/rooms\/(\d+)$/);
  if (req.method === 'GET' && roomsMatch) {
    const dir = path.join(ROOM_DIR, roomsMatch[1]);
    resJSON(res, fs.existsSync(dir) ? fs.readdirSync(dir).filter(f=>!f.startsWith('.')) : []);
    return;
  }

  const roomMatch = p.match(/^\/api\/room\/(\d+)\/(.+)$/);
  if (roomMatch) {
    const fp = safeRoomPath(roomMatch[1], roomMatch[2]);
    if (!fp) { res404(res); return; }
    if (req.method === 'GET') {
      if (!fs.existsSync(fp)) { res404(res); return; }
      res.writeHead(200, {'Content-Type':'text/plain;charset=utf-8'});
      res.end(fs.readFileSync(fp, 'utf8')); return;
    }
    if (req.method === 'POST') {
      let body = '';
      req.on('data', d => body += d);
      req.on('end', () => { fs.writeFileSync(fp, body, 'utf8'); resJSON(res, {ok:true}); });
      return;
    }
    if (req.method === 'DELETE') {
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
      resJSON(res, {ok:true}); return;
    }
  }

  const backupsMatch = p.match(/^\/api\/backups\/(\d+)$/);
  if (backupsMatch) {
    const dir = path.join(BACKUP_DIR, backupsMatch[1]);
    if (req.method === 'GET') {
      resJSON(res, fs.existsSync(dir) ? fs.readdirSync(dir).filter(f=>!f.startsWith('.')).sort() : []); return;
    }
    if (req.method === 'DELETE') {
      if (fs.existsSync(dir)) fs.readdirSync(dir).forEach(f => fs.unlinkSync(path.join(dir, f)));
      resJSON(res, {ok:true}); return;
    }
  }

  const backupMatch = p.match(/^\/api\/backup\/(\d+)\/(.+)$/);
  if (backupMatch) {
    const fp = safeBackupPath(backupMatch[1], backupMatch[2]);
    if (!fp) { res404(res); return; }
    if (req.method === 'GET') {
      if (!fs.existsSync(fp)) { res404(res); return; }
      res.writeHead(200, {'Content-Type':'application/json;charset=utf-8'});
      res.end(fs.readFileSync(fp, 'utf8')); return;
    }
    if (req.method === 'POST') {
      let body = '';
      req.on('data', d => body += d);
      req.on('end', () => { fs.writeFileSync(fp, body, 'utf8'); resJSON(res, {ok:true}); });
      return;
    }
    if (req.method === 'DELETE') {
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
      resJSON(res, {ok:true}); return;
    }
  }

  const linesMatch = p.match(/^\/api\/lines\/(\d+)$/);
  if (req.method === 'GET' && linesMatch) {
    const dir = path.join(ROOT, 'line', linesMatch[1]);
    resJSON(res, fs.existsSync(dir) ? fs.readdirSync(dir).filter(f=>!f.startsWith('.')) : []);
    return;
  }

  const lineFileMatch = p.match(/^\/api\/line\/(\d+)\/(.+)$/);
  if (lineFileMatch) {
    const dir = path.join(ROOT, 'line', String(parseInt(lineFileMatch[1])));
    if (!fs.existsSync(dir)) { res404(res); return; }
    const fp  = path.join(dir, decodeURIComponent(lineFileMatch[2]));
    if (!fp.startsWith(dir)) { res404(res); return; }
    if (req.method === 'GET') {
      if (!fs.existsSync(fp)) { res404(res); return; }
      res.writeHead(200, {'Content-Type':'text/plain;charset=utf-8'});
      res.end(fs.readFileSync(fp, 'utf8')); return;
    }
    if (req.method === 'POST') {
      let body = '';
      req.on('data', d => body += d);
      req.on('end', () => { fs.writeFileSync(fp, body, 'utf8'); resJSON(res, {ok:true}); });
      return;
    }
    if (req.method === 'DELETE') {
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
      resJSON(res, {ok:true}); return;
    }
  }

  const markersMatch = p.match(/^\/api\/markers\/(\d+)$/);
  if (req.method === 'GET' && markersMatch) {
    const dir = path.join(ROOT, 'marker', markersMatch[1]);
    resJSON(res, fs.existsSync(dir) ? fs.readdirSync(dir).filter(f=>!f.startsWith('.')) : []);
    return;
  }

  const markerMatch = p.match(/^\/api\/marker\/(\d+)\/(.+)$/);
  if (markerMatch) {
    const dir = path.join(ROOT, 'marker', String(parseInt(markerMatch[1])));
    if (!fs.existsSync(dir)) { res404(res); return; }
    const fp  = path.join(dir, decodeURIComponent(markerMatch[2]));
    if (!fp.startsWith(dir)) { res404(res); return; }
    if (req.method === 'GET') {
      if (!fs.existsSync(fp)) { res404(res); return; }
      res.writeHead(200, {'Content-Type':'text/plain;charset=utf-8'});
      res.end(fs.readFileSync(fp, 'utf8')); return;
    }
    if (req.method === 'POST') {
      let body = '';
      req.on('data', d => body += d);
      req.on('end', () => { fs.writeFileSync(fp, body, 'utf8'); resJSON(res, {ok:true}); });
      return;
    }
    if (req.method === 'DELETE') {
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
      resJSON(res, {ok:true}); return;
    }
  }

  const flrMarkersMatch = p.match(/^\/api\/flr_markers\/(\d+)$/);
  if (req.method === 'GET' && flrMarkersMatch) {
    const dir = path.join(ROOT, 'flr_marker', flrMarkersMatch[1]);
    resJSON(res, fs.existsSync(dir) ? fs.readdirSync(dir).filter(f=>!f.startsWith('.')) : []);
    return;
  }

  const flrMarkerMatch = p.match(/^\/api\/flr_marker\/(\d+)\/(.+)$/);
  if (flrMarkerMatch) {
    const dir = path.join(ROOT, 'flr_marker', String(parseInt(flrMarkerMatch[1])));
    if (!fs.existsSync(dir)) { res404(res); return; }
    const fp = path.join(dir, decodeURIComponent(flrMarkerMatch[2]));
    if (!fp.startsWith(dir)) { res404(res); return; }
    if (req.method === 'GET') {
      if (!fs.existsSync(fp)) { res404(res); return; }
      res.writeHead(200,{'Content-Type':'text/plain;charset=utf-8'});
      res.end(fs.readFileSync(fp,'utf8')); return;
    }
    if (req.method === 'POST') {
      let body=''; req.on('data',d=>body+=d);
      req.on('end',()=>{fs.writeFileSync(fp,body,'utf8');resJSON(res,{ok:true});}); return;
    }
    if (req.method === 'DELETE') {
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
      resJSON(res,{ok:true}); return;
    }
  }

  // 이미지 업로드 API
  if (req.method === 'POST' && p === '/api/upload-image') {
    const imgDir = path.join(ROOT, 'image');
    if (!fs.existsSync(imgDir)) fs.mkdirSync(imgDir, { recursive: true });
    const chunks = [];
    req.on('data', d => chunks.push(d));
    req.on('end', () => {
      try {
        const body = Buffer.concat(chunks);
        const bodyStr = body.toString();
        // multipart 간단 파싱: Content-Disposition에서 filename 추출
        const nameMatch = bodyStr.match(/filename="([^"]+)"/);
        if (!nameMatch) { res.writeHead(400); res.end('No filename'); return; }
        const filename = path.basename(nameMatch[1]);
        const destPath = path.join(imgDir, filename);
        // 이미 있으면 그대로 사용
        if (fs.existsSync(destPath)) {
          resJSON(res, { ok: true, filename, exists: true }); return;
        }
        // 바이너리 데이터 추출 (multipart body에서 헤더 이후 부분)
        const headerEnd = body.indexOf('\r\n\r\n');
        if (headerEnd === -1) { res.writeHead(400); res.end('Invalid'); return; }
        // 경계 찾기
        const boundaryMatch = req.headers['content-type']?.match(/boundary=(.+)/);
        if (!boundaryMatch) { res.writeHead(400); res.end('No boundary'); return; }
        const boundary = '--' + boundaryMatch[1].trim();
        const boundaryBuf = Buffer.from(boundary);
        const start = body.indexOf('\r\n\r\n') + 4;
        const endBoundary = Buffer.from('\r\n' + boundary);
        const end = body.indexOf(endBoundary, start);
        const fileData = end > 0 ? body.slice(start, end) : body.slice(start);
        fs.writeFileSync(destPath, fileData);
        resJSON(res, { ok: true, filename, exists: false });
      } catch(e) {
        console.error('upload error:', e);
        res.writeHead(500); res.end('Upload failed');
      }
    });
    return;
  }

  // 이미지 목록 API
  if (req.method === 'GET' && p === '/api/images') {
    const imgDir = path.join(ROOT, 'image');
    const files = fs.existsSync(imgDir)
      ? fs.readdirSync(imgDir).filter(f => /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(f))
      : [];
    resJSON(res, files);
    return;
  }

  // 정적 파일
  let filePath = decodeURIComponent(path.join(ROOT, p));
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) { res404(res); return; }
  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, {'Content-Type': MIME[ext] || 'application/octet-stream'});
  fs.createReadStream(filePath).pipe(res);

}).listen(PORT, () => {
  console.log(`✅ 서버 실행 중: http://localhost:${PORT}`);
});
