/* ============================================
   FILE-BROWSER.JS — GitHub API File Browser
   ============================================ */

class FileBrowser {
    constructor(containerId, owner, repo) {
        this.container = document.getElementById(containerId);
        this.owner = owner;
        this.repo = repo;
        this.cache = {};
        this.modal = null;
        this.init();
    }

    async init() {
        if (!this.container) return;
        this.createModal();
        this.container.innerHTML = `
      <div class="file-browser-container">
        <div class="file-browser-header">
          <h3>📂 Repository Files</h3>
          <a href="https://github.com/${this.owner}/${this.repo}" target="_blank" rel="noopener">
            View on GitHub →
          </a>
        </div>
        <div class="file-tree" id="file-tree-${this.repo}">
          <div class="file-loading">
            <span class="spinner"></span> Loading repository files...
          </div>
        </div>
      </div>
    `;

        try {
            const items = await this.fetchContents('');
            const treeEl = document.getElementById(`file-tree-${this.repo}`);
            treeEl.innerHTML = '';
            this.renderTree(items, treeEl, 0);
        } catch (err) {
            const treeEl = document.getElementById(`file-tree-${this.repo}`);
            treeEl.innerHTML = `
        <div class="file-error">
          ⚠️ Could not load files. GitHub API rate limit may have been reached.
          <br><small>Try again in a few minutes, or <a href="https://github.com/${this.owner}/${this.repo}" target="_blank">view on GitHub</a>.</small>
        </div>
      `;
        }
    }

    /* ---------- GitHub API ---------- */
    async fetchContents(path) {
        const cacheKey = `${this.owner}/${this.repo}/${path}`;
        if (this.cache[cacheKey]) return this.cache[cacheKey];

        const url = `https://api.github.com/repos/${this.owner}/${this.repo}/contents/${path}`;
        const res = await fetch(url);

        if (!res.ok) {
            throw new Error(`GitHub API error: ${res.status}`);
        }

        const data = await res.json();
        this.cache[cacheKey] = data;
        return data;
    }

    /* ---------- Render File Tree ---------- */
    renderTree(items, parentEl, depth) {
        // Sort: folders first, then files alphabetically
        const sorted = [...items].sort((a, b) => {
            if (a.type === 'dir' && b.type !== 'dir') return -1;
            if (a.type !== 'dir' && b.type === 'dir') return 1;
            return a.name.localeCompare(b.name);
        });

        // Filter out unwanted files
        const filtered = sorted.filter(item => {
            const ignore = ['.gitignore', '.git', '__pycache__', '.DS_Store', 'node_modules', '.ipynb_checkpoints'];
            return !ignore.includes(item.name);
        });

        filtered.forEach(item => {
            const el = document.createElement('div');
            el.className = 'file-item';
            el.style.paddingLeft = `${20 + depth * 20}px`;

            if (item.type === 'dir') {
                el.innerHTML = `
          <span class="icon">📁</span>
          <span class="name folder-name">${item.name}</span>
          <span class="size" style="font-size:0.75rem; color: var(--text-muted);">▸</span>
        `;
                parentEl.appendChild(el);

                // Create children container (collapsed by default)
                const childContainer = document.createElement('div');
                childContainer.className = 'file-children collapsed';
                childContainer.dataset.path = item.path;
                childContainer.dataset.loaded = 'false';
                parentEl.appendChild(childContainer);

                el.addEventListener('click', async () => {
                    const arrow = el.querySelector('.size');

                    if (childContainer.dataset.loaded === 'false') {
                        // First click: load contents
                        childContainer.innerHTML = `<div class="file-loading" style="padding: 8px 20px;"><span class="spinner"></span> Loading...</div>`;
                        childContainer.classList.remove('collapsed');
                        arrow.textContent = '▾';

                        try {
                            const children = await this.fetchContents(item.path);
                            childContainer.innerHTML = '';
                            this.renderTree(children, childContainer, depth + 1);
                            childContainer.dataset.loaded = 'true';
                        } catch (err) {
                            childContainer.innerHTML = `<div class="file-error" style="padding: 8px 20px; font-size: 0.82rem;">Failed to load</div>`;
                        }
                    } else {
                        // Toggle visibility
                        childContainer.classList.toggle('collapsed');
                        arrow.textContent = childContainer.classList.contains('collapsed') ? '▸' : '▾';
                    }
                });
            } else {
                // File
                const icon = this.getFileIcon(item.name);
                const size = this.formatSize(item.size);

                el.innerHTML = `
          <span class="icon">${icon}</span>
          <span class="name">${item.name}</span>
          <span class="size">${size}</span>
        `;

                el.addEventListener('click', () => this.viewFile(item));
                parentEl.appendChild(el);
            }
        });
    }

    /* ---------- View File in Modal ---------- */
    async viewFile(item) {
        const overlay = this.modal;
        const title = overlay.querySelector('.modal-header h3');
        const body = overlay.querySelector('.modal-body');

        title.innerHTML = `${this.getFileIcon(item.name)} ${item.name}`;

        // Check file type
        const ext = item.name.split('.').pop().toLowerCase();
        const imageExts = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'];
        const binaryExts = ['joblib', 'pkl', 'h5', 'rar', 'zip', 'exe', 'dll', 'whl', 'pyc'];
        const notebookExt = 'ipynb';

        if (binaryExts.includes(ext)) {
            body.innerHTML = `
        <div class="binary-notice">
          <div class="icon">📦</div>
          <p>Binary file — ${this.formatSize(item.size)}</p>
          <p style="margin-top:8px;"><a href="${item.html_url}" target="_blank" style="color:var(--primary);font-weight:600;">View on GitHub →</a></p>
        </div>
      `;
        } else if (imageExts.includes(ext)) {
            body.innerHTML = `
        <div class="image-preview">
          <img src="${item.download_url}" alt="${item.name}" />
        </div>
      `;
        } else if (ext === notebookExt) {
            body.innerHTML = `
        <div class="binary-notice">
          <div class="icon">📓</div>
          <p>Jupyter Notebook — ${this.formatSize(item.size)}</p>
          <p style="margin-top:8px;"><a href="https://nbviewer.org/github/${this.owner}/${this.repo}/blob/main/${item.path}" target="_blank" style="color:var(--primary);font-weight:600;">Open in nbviewer →</a></p>
          <p style="margin-top:4px;"><a href="${item.html_url}" target="_blank" style="color:var(--text-muted);font-size:0.85rem;">View on GitHub →</a></p>
        </div>
      `;
        } else {
            // Text file - fetch content
            body.innerHTML = `<div class="file-loading" style="padding: 40px;"><span class="spinner"></span> Loading file...</div>`;

            try {
                const res = await fetch(item.download_url);
                const text = await res.text();
                const lang = this.getLang(ext);

                // Truncate very large files
                const maxChars = 50000;
                let displayText = text;
                if (text.length > maxChars) {
                    displayText = text.substring(0, maxChars) + `\n\n... (truncated — ${this.formatSize(item.size)} total)`;
                }

                body.innerHTML = `<pre><code class="language-${lang}">${this.escapeHtml(displayText)}</code></pre>`;

                // Highlight with Prism if available
                if (window.Prism) {
                    Prism.highlightAllUnder(body);
                }
            } catch (err) {
                body.innerHTML = `
          <div class="file-error">
            Could not load file content.
            <br><a href="${item.html_url}" target="_blank" style="color:var(--primary);">View on GitHub →</a>
          </div>
        `;
            }
        }

        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    /* ---------- Modal ---------- */
    createModal() {
        // Only create one modal per page
        if (document.getElementById('file-modal')) {
            this.modal = document.getElementById('file-modal');
            return;
        }

        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.id = 'file-modal';
        overlay.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h3></h3>
          <button class="modal-close" title="Close">✕</button>
        </div>
        <div class="modal-body"></div>
      </div>
    `;

        document.body.appendChild(overlay);
        this.modal = overlay;

        // Close handlers
        overlay.querySelector('.modal-close').addEventListener('click', () => this.closeModal());
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) this.closeModal();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.closeModal();
        });
    }

    closeModal() {
        this.modal.classList.remove('active');
        document.body.style.overflow = '';
    }

    /* ---------- Helpers ---------- */
    getFileIcon(name) {
        const ext = name.split('.').pop().toLowerCase();
        const icons = {
            'py': '🐍',
            'ipynb': '📓',
            'csv': '📊',
            'json': '📋',
            'md': '📝',
            'txt': '📄',
            'png': '🖼️',
            'jpg': '🖼️',
            'jpeg': '🖼️',
            'gif': '🖼️',
            'svg': '🖼️',
            'html': '🌐',
            'css': '🎨',
            'js': '⚡',
            'yml': '⚙️',
            'yaml': '⚙️',
            'toml': '⚙️',
            'cfg': '⚙️',
            'ini': '⚙️',
            'joblib': '🤖',
            'pkl': '🤖',
            'h5': '🤖',
            'rar': '📦',
            'zip': '📦',
            'docx': '📝',
            'pdf': '📕',
            'requirements': '📋',
        };

        // Check full filename for special cases
        if (name === 'requirements.txt') return '📋';
        if (name === 'README.md') return '📖';
        if (name === 'LICENSE') return '⚖️';
        if (name === '.gitignore') return '🙈';

        return icons[ext] || '📄';
    }

    formatSize(bytes) {
        if (!bytes) return '';
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    getLang(ext) {
        const map = {
            'py': 'python',
            'js': 'javascript',
            'css': 'css',
            'html': 'markup',
            'json': 'json',
            'md': 'markdown',
            'yml': 'yaml',
            'yaml': 'yaml',
            'txt': 'plaintext',
            'csv': 'plaintext',
            'sh': 'bash',
            'bash': 'bash',
            'sql': 'sql',
        };
        return map[ext] || 'plaintext';
    }

    escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
}
