let isEditMode = false;

function enableMapEdit() {
    isEditMode = true;
    lockMap();
    alert('编辑模式已开启！\n地图已锁定，右键拖动点位调整位置！');

    const pins = document.querySelectorAll('.map-pin');
    pins.forEach(pin => {
        pin.style.cursor = 'move';
        pin.oncontextmenu = e => e.preventDefault();
        pin.onmousedown = e => {
            if (e.button !== 2) return;
            startDrag(e, pin);
        };
    });
}

function startDrag(e, pin) {
    e.preventDefault();
    const mapContent = document.getElementById('map-content');

    function move(e) {
        const rect = mapContent.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        pin.style.left = x + 'px';
        pin.style.top = y + 'px';
    }

    function stopDrag() {
        document.removeEventListener('mousemove', move);
        document.removeEventListener('mouseup', stopDrag);
    }

    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', stopDrag);
}

function exportUpdatedJson() {
    if (!isEditMode) {
        alert('请先进入编辑模式！');
        return;
    }

    const pins = document.querySelectorAll('.map-pin');
    const updated = buildings.map(item => {
        const pin = Array.from(pins).find(p => parseInt(p.dataset.id) === item.id);
        if (pin) {
            return {
                ...item,
                x: parseInt(pin.style.left) || item.x,
                y: parseInt(pin.style.top) || item.y
            };
        }
        return item;
    });

    const dataStr = `const buildingData = [\n${updated.map(b => JSON.stringify(b, null, 2)).join(',\n')}\n];`;
    const blob = new Blob([dataStr], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'buildings.js';
    a.click();
    URL.revokeObjectURL(url);
    alert('导出成功！覆盖 data/buildings.js 后刷新生效！');
}

window.enableMapEdit = enableMapEdit;
window.exportUpdatedJson = exportUpdatedJson;