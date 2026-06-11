with open('index.html', 'r') as f:
    html = f.read()

# 1. Add autoInitHost to modern_js_hooks
patch1 = """
// --- MODERN UI BINDINGS ---
async function autoInitHost() {
    if (typeof initPeer !== 'function') return;
    try {
        const peer = await initPeer();
        window.myPeer = peer;
        document.getElementById('modern-my-code').textContent = peer.id;
        
        peer.on('connection', conn => {
            console.log('[SyncDrop] Incoming modern connection:', conn.peer);
            activeConnections.push(conn);
            
            conn.on('open', () => {
                console.log('[SyncDrop] DataChannel open (Host)');
                if(typeof listenForFile === 'function') listenForFile(conn);
            });
            conn.on('error', err => console.error('Host conn error:', err));
        });
    } catch(e) {
        console.error("Auto-init failed:", e);
    }
}
autoInitHost();

// Auto-send files when selected
const origUpdatePreview = updateFilePreviewList;
updateFilePreviewList = function() {
    origUpdatePreview();
    if(selectedFiles.length > 0 && typeof activeConnections !== 'undefined' && activeConnections.length > 0) {
        activeConnections.forEach(conn => {
            if(conn.open) {
                console.log("Auto-sending files!");
                if(typeof sendInChunks === 'function') sendInChunks(conn);
            }
        });
    } else if (selectedFiles.length > 0) {
        alert("Please connect to a device first!");
        selectedFiles.length = 0; // Clear files if not connected
    }
};

setTimeout(() => {
"""
html = html.replace("// --- MODERN UI BINDINGS ---\nsetTimeout(() => {", patch1)

with open('index.html', 'w') as f:
    f.write(html)
print("Patched index.html")
