const ProgressAPI = (() => {
    const pane = document.getElementById('progressPane');
    const label = document.getElementById('progressLabel');
    const bar = pane.querySelector('.progressBar');

    return {
        show: () => pane.style.display = 'block',
        hide: () => pane.style.display = 'none',
        setLabel: (text) => label.textContent = text,
        setProgress: (percent) => bar.style.width = Math.max(0, Math.min(100, percent)) + '%',
        update: (text, percent) => {
            if (text !== undefined) label.textContent = text;
            if (percent !== undefined) bar.style.width = Math.max(0, Math.min(100, percent)) + '%';
        }
    };
})();
