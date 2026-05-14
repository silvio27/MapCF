let buildings = [];
let scale = 1;
let posX = 0;
let posY = 0;
let isDragging = false;
let startX, startY;
let mapLocked = false;

// 轮播相关变量
let currentSlide = 0;
let playInterval = null;

// 当前添加的建筑（用于导出）
let currentAddedBuilding = null;

// 当前详情页显示的楼道（用于编辑）
let currentDetailItem = null;

const typeColorMap = {
    "联合接待楼组": "rgb(217,47,46)",
    "多元共建楼组": "rgb(0,162,205)",
    "儿童友好楼组": "rgb(114,53,126)",
    "资源共享楼组": "rgb(233,132,44)",
    "共商共议楼组": "rgb(218,15,115)",
    "邻里互助楼组": "rgb(117,184,67)"
};

async function loadData() {
  // 使用 waitForData 确保所有数据加载完成
  if (typeof waitForData === 'function') {
    try {
      const data = await waitForData();
      buildings = data;
      console.log(`📥 数据加载完成，共 ${buildings.length} 个建筑`);
      init();
    } catch (e) {
      console.error('❌ 数据加载失败:', e);
      // 备用方案
      if (typeof buildingData !== 'undefined') {
        buildings = buildingData;
        init();
      }
    }
  } else {
    // 如果没有 waitForData，使用备用方案
    if (typeof buildingData !== 'undefined') {
      buildings = buildingData;
      init();
    }
  }
}

const typeColors = {
    "联合接待楼组": "联合接待",
    "多元共建楼组": "多元共建",
    "儿童友好楼组": "儿童友好",
    "资源共享楼组": "资源共享",
    "共商共议楼组": "共商共议",
    "邻里互助楼组": "邻里互助"
};

function init() {
    initMapDrag();
    initMapWheel();
    resetMapToFull();
    renderList();
    renderCategory();
    switchTab();
    mapTagHover();
    filterList();
    bindAdminForm();
    initBuildingPanel();
    
    // 确保 DOM 完全渲染后再渲染地图点位
    requestAnimationFrame(() => {
        renderMap();
        // 地图渲染后再绑定鼠标提示框
        initMouseTooltip();
    });
    
    // 添加窗口resize事件监听，实现响应式点位坐标
    window.addEventListener('resize', debounce(updateMapTransform, 100));
}

// 防抖函数，避免resize事件频繁触发
function debounce(func, delay) {
    let timer = null;
    return function() {
        clearTimeout(timer);
        timer = setTimeout(func, delay);
    };
}

function lockMap() {
    mapLocked = true;
    scale = 1;
    posX = 0;
    posY = 0;
    updateMapTransform();
}

function resetMapToFull() {
    scale = 1;
    posX = 0;
    posY = 0;
    updateMapTransform();
}

function initMapDrag() {
    // 禁用地图拖动
}

function initMapWheel() {
    // 禁用缩放，地图大小固定
}

// 地图图片实际尺寸（根据数据中的最大坐标估算）
const MAP_WIDTH = 1100;
const MAP_HEIGHT = 700;

function updateMapTransform() {
    // 地图按100%展示，点位直接使用原始坐标（地图左上角为原点）
    // 此函数保留用于调试和未来扩展
    console.log('updateMapTransform: 地图按100%展示，点位坐标无需变换');
}

// 点位默认 = 第一个分类颜色
function renderMap() {
    const mapBox = document.getElementById('map-box');
    if (!mapBox) return;

    // 获取或创建点位容器
    let pinsContainer = document.getElementById('pins-container');
    if (!pinsContainer) {
        pinsContainer = document.createElement('div');
        pinsContainer.id = 'pins-container';
        pinsContainer.className = 'pins-container';
        mapBox.appendChild(pinsContainer);
    }

    console.log('渲染点位，数据数量:', buildings.length);

    // 清空现有点位
    pinsContainer.innerHTML = '';

    buildings.forEach(item => {
        const pin = document.createElement('div');
        pin.className = 'map-pin';
        pin.innerText = `${item.id} ${item.name}`;

        // 存储原始坐标（地图左上角为原点(0,0)）
        pin.dataset.origX = item.x;
        pin.dataset.origY = item.y;

        // 直接使用原始坐标，地图左上角为原点(0,0)
        console.log(`点位 ${item.id}: x=${item.x}, y=${item.y}`);
        
        pin.style.left = item.x + 'px';
        pin.style.top = item.y + 'px';

        pin.dataset.types = item.types.join(',');
        pin.dataset.name = item.name;
        pin.dataset.desc = item.desc;
        pin.dataset.id = item.id;

        const firstType = item.types[0];
        pin.style.background = typeColorMap[firstType] || '#165DFF';

        pin.onclick = () => openDetail(item.id);
        pinsContainer.appendChild(pin);
    });
}

function switchTab() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(btn.dataset.view + '-view').classList.add('active');
        });
    });
}

// 标签悬浮效果
function mapTagHover() {
    document.querySelectorAll('.map-tag').forEach(tag => {
        const type = tag.dataset.type;

        tag.addEventListener('mouseenter', () => {
            const pins = document.querySelectorAll('.map-pin');
            pins.forEach((p) => {
                const pinTypes = p.dataset.types.split(',');
                if (pinTypes.includes(type)) {
                    p.style.background = typeColorMap[type];
                } else {
                    p.style.opacity = 0.2;
                }
            });
        });

        tag.addEventListener('mouseleave', () => {
            const pins = document.querySelectorAll('.map-pin');
            pins.forEach(p => {
                const types = p.dataset.types.split(',');
                p.style.background = typeColorMap[types[0]] || '#165DFF';
                p.style.opacity = 1;
            });
        });
    });
}

// 房子浮窗
function initBuildingPanel() {
    const panel = document.querySelector('.building-float-panel');
    const img = document.getElementById('buildingPreviewImg');

    document.querySelectorAll('.map-tag').forEach(tag => {
        const type = tag.dataset.type;

        tag.addEventListener('mouseenter', () => {
            img.src = `building/${type}.jpg`;
            panel.style.display = 'block';
        });

        tag.addEventListener('mouseleave', () => {
            panel.style.display = 'none';
        });
    });
}

// 鼠标跟随提示框（白底+分类色边框+黑字）
function initMouseTooltip() {
    const tip = document.querySelector('.mouse-tooltip');

    document.querySelectorAll('.map-pin').forEach(pin => {
        pin.addEventListener('mouseenter', (e) => {
            const name = pin.dataset.name;
            const types = pin.dataset.types.split(',');
            const firstType = types[0];
            const color = typeColorMap[firstType];

            tip.innerHTML = `<strong style="color: ${color};">${name}</strong><br>${pin.dataset.desc}`;
            tip.style.display = 'block';
            tip.style.border = `2px solid ${color}`;
            tip.style.background = '#fff';
            tip.style.color = '#000';
            tip.style.maxWidth = '300px';
            tip.style.whiteSpace = 'normal';
            tip.style.wordBreak = 'break-word';
        });

        pin.addEventListener('mousemove', (e) => {
            const x = Math.min(e.pageX, window.innerWidth - tip.offsetWidth - 20);
            const y = Math.max(e.pageY - tip.offsetHeight - 10, 20);
            tip.style.left = x + 'px';
            tip.style.top = y + 'px';
        });

        pin.addEventListener('mouseleave', () => {
            tip.style.display = 'none';
        });
    });
}

function renderList(filter = 'all') {
    const list = document.getElementById('card-list');
    list.innerHTML = '';
    let data = filter === 'all' ? buildings : buildings.filter(b => b.types.includes(filter));
    data.forEach(item => {
        const card = document.createElement('div');
        card.className = 'card';
        
        // 使用 imgs 数组的第一张图片作为封面图
        const coverImg = item.imgs && item.imgs.length > 0 ? item.imgs[0] : '';
        
        let tags = item.types.map(t => `<span class="type-tag ${typeColors[t]}">${t}</span>`).join('');
        
        // 根据是否有封面图设置背景
        const imgStyle = coverImg ? `style="background-image:url('${coverImg}')"` : '';
        
        card.innerHTML = `
        <div class="card-img" ${imgStyle}></div>
        <div class="card-body">
            <h3 class="card-title">${item.name}</h3>
            <div class="card-tags">${tags}</div>
            <button class="card-btn" onclick="openDetail(${item.id})">查看详情</button>
        </div>`;
        list.appendChild(card);
    });
}

function filterList() {
    document.querySelectorAll('.filter-tag').forEach(tag => {
        tag.addEventListener('click', () => {
            document.querySelectorAll('.filter-tag').forEach(t => t.classList.remove('active'));
            tag.classList.add('active');
            renderList(tag.dataset.filter);
        });
    });
}

function renderCategory() {
    const grid = document.getElementById('category-grid');
    if (!grid) return;
    
    const categories = [
        { name: '联合接待楼组', label: '联合接待', img: './building/联合接待楼组.jpg' },
        { name: '多元共建楼组', label: '多元共建', img: './building/多元共建楼组.jpg' },
        { name: '儿童友好楼组', label: '儿童友好', img: './building/儿童友好楼组.jpg' },
        { name: '资源共享楼组', label: '资源共享', img: './building/资源共享楼组.jpg' },
        { name: '共商共议楼组', label: '共商共议', img: './building/共商共议楼组.jpg' },
        { name: '邻里互助楼组', label: '邻里互助', img: './building/邻里互助楼组.jpg' }
    ];
    
    grid.innerHTML = '';
    
    categories.forEach(cat => {
        const count = buildings.filter(b => b.types.includes(cat.name)).length;
        const card = document.createElement('div');
        card.className = `category-card category-${cat.label}`;
        card.innerHTML = `
            <img class="category-image" src="${cat.img}" alt="${cat.label}" onerror="this.style.display='none'">
            <div class="category-name">${cat.label}</div>
            <div class="category-count">${count} 个楼道</div>
        `;
        card.addEventListener('click', () => {
            document.querySelector('.tab-btn[data-view="list"]').click();
            document.querySelectorAll('.filter-tag').forEach(t => t.classList.remove('active'));
            document.querySelector(`.filter-tag[data-filter="${cat.name}"]`)?.classList.add('active');
            renderList(cat.name);
        });
        grid.appendChild(card);
    });
}

function openDetail(id) {
    const item = buildings.find(b => b.id === id);
    if (!item) return;
    
    // 保存当前楼道用于编辑
    currentDetailItem = item;
    
    document.querySelector('.tab-btn[data-view="detail"]').click();
    
    // 使用 imgs 数组的第一张图片作为封面图
    const coverImg = item.imgs && item.imgs.length > 0 ? item.imgs[0] : '';
    const img = document.getElementById('detail-img');
    
    if (coverImg) {
        img.style.backgroundImage = `url('${coverImg}')`;
    } else {
        // 如果没有封面图，使用默认图片
        const p = item.img.toString().padStart(2, '0');
        img.style.backgroundImage = `url('img/${p}.webp'),url('img/${p}.png'),url('img/${p}.jpg')`;
    }
    let tags = item.types.map(t => `<span class="type-tag ${typeColors[t]}">${t}</span>`).join('');
    
    // 构建获奖情况HTML
    let awardsHtml = '';
    if (item.awards && item.awards.length > 0) {
        awardsHtml = `<div class="detail-section awards-section">
            <h3>🏆 获奖情况</h3>
            <div class="awards-list">
                ${item.awards.map(award => `
                    <div class="award-item">
                        <span class="award-name">${award.name}</span>
                        <span class="award-level ${award.level}">${award.level}</span>
                        <span class="award-year">${award.year}</span>
                    </div>
                `).join('')}
            </div>
        </div>`;
    }
    
    document.getElementById('detail-body').innerHTML = `
        <h2 class="detail-title">${item.name}</h2>
        <div style="margin-bottom:20px;">${tags}</div>
        ${awardsHtml}
        <div class="detail-section"><h3>基本介绍</h3><p>${item.desc}</p></div>
        <div class="detail-section"><h3>案例故事</h3><p>${item.story}</p></div>
        <div class="detail-section"><h3>工作法</h3><p>${item.method}</p></div>
        <div class="detail-section"><h3>经验总结</h3><p>${item.summary}</p></div>
    `;
    renderCarousel(item);
}

function backToList() {
    document.querySelector('.tab-btn[data-view="list"]').click();
}

function openDetailEdit() {
    if (!currentDetailItem) {
        alert('请先选择一个楼道');
        return;
    }
    
    const item = currentDetailItem;
    
    // 创建编辑表单
    const formHTML = `
        <div class="edit-modal" id="edit-modal">
            <div class="edit-form">
                <h3>编辑楼道: ${item.name}</h3>
                
                <div class="edit-row">
                    <label>楼道名称</label>
                    <input type="text" id="edit_name" value="${item.name}">
                </div>
                
                <div class="edit-row">
                    <label>类型（可多选）</label>
                    <div class="type-checkboxes">
                        <label><input type="checkbox" value="联合接待楼组" ${item.types.includes('联合接待楼组') ? 'checked' : ''}> 联合接待楼组</label>
                        <label><input type="checkbox" value="多元共建楼组" ${item.types.includes('多元共建楼组') ? 'checked' : ''}> 多元共建楼组</label>
                        <label><input type="checkbox" value="儿童友好楼组" ${item.types.includes('儿童友好楼组') ? 'checked' : ''}> 儿童友好楼组</label>
                        <label><input type="checkbox" value="资源共享楼组" ${item.types.includes('资源共享楼组') ? 'checked' : ''}> 资源共享楼组</label>
                        <label><input type="checkbox" value="共商共议楼组" ${item.types.includes('共商共议楼组') ? 'checked' : ''}> 共商共议楼组</label>
                        <label><input type="checkbox" value="邻里互助楼组" ${item.types.includes('邻里互助楼组') ? 'checked' : ''}> 邻里互助楼组</label>
                    </div>
                </div>
                
                <div class="edit-row">
                    <label>基本介绍</label>
                    <textarea id="edit_desc">${item.desc || ''}</textarea>
                </div>
                
                <div class="edit-row">
                    <label>案例故事</label>
                    <textarea id="edit_story">${item.story || ''}</textarea>
                </div>
                
                <div class="edit-row">
                    <label>工作法</label>
                    <textarea id="edit_method">${item.method || ''}</textarea>
                </div>
                
                <div class="edit-row">
                    <label>经验总结</label>
                    <textarea id="edit_summary">${item.summary || ''}</textarea>
                </div>
                
                <div class="edit-actions">
                    <button onclick="saveDetailEdit()">保存修改</button>
                    <button onclick="closeDetailEdit()">取消</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', formHTML);
}

function closeDetailEdit() {
    const modal = document.getElementById('edit-modal');
    if (modal) {
        modal.remove();
    }
}

function saveDetailEdit() {
    if (!currentDetailItem) return;
    
    const item = currentDetailItem;
    
    item.name = document.getElementById('edit_name').value;
    
    // 获取多选的类型
    const checkedBoxes = document.querySelectorAll('.type-checkboxes input:checked');
    item.types = Array.from(checkedBoxes).map(cb => cb.value);
    
    item.desc = document.getElementById('edit_desc').value;
    item.story = document.getElementById('edit_story').value;
    item.method = document.getElementById('edit_method').value;
    item.summary = document.getElementById('edit_summary').value;
    
    // 更新详情页显示
    openDetail(item.id);
    
    // 关闭编辑弹窗
    closeDetailEdit();
    
    alert('修改已保存！');
}

function getNextImageNumber() {
    if (buildings.length === 0) return 1;
    const maxImg = Math.max(...buildings.map(b => b.img || 0));
    return maxImg + 1;
}

function updateAutoImageNumber() {
    const imgInput = document.getElementById('a_img');
    if (imgInput) {
        imgInput.value = getNextImageNumber();
    }
}

function goToMapForCoord() {
    document.querySelector('.tab-btn[data-view="map"]').click();
    enableCoordSelect();
}

function enableCoordSelect() {
    const mapBox = document.getElementById('map-box');
    if (!mapBox) return;
    
    mapBox.addEventListener('click', handleMapClickForCoord);
    mapBox.style.cursor = 'crosshair';
    
    const existingHint = document.querySelector('.coord-hint');
    if (!existingHint) {
        const hint = document.createElement('div');
        hint.className = 'coord-hint';
        hint.textContent = '点击地图选择位置，选择后自动返回';
        hint.style.cssText = 'position: absolute; top: 10px; left: 50%; transform: translateX(-50%); background: rgba(217, 47, 46, 0.9); color: white; padding: 10px 20px; border-radius: 8px; z-index: 100; font-weight: bold;';
        document.getElementById('map-view').appendChild(hint);
    }
}

function handleMapClickForCoord(e) {
    const mapBox = document.getElementById('map-box');
    const rect = mapBox.getBoundingClientRect();
    const x = Math.round((e.clientX - rect.left) / rect.width * 1200);
    const y = Math.round((e.clientY - rect.top) / rect.height * 600);
    
    document.getElementById('a_x').value = x;
    document.getElementById('a_y').value = y;
    document.getElementById('coord-x').textContent = x;
    document.getElementById('coord-y').textContent = y;
    
    mapBox.removeEventListener('click', handleMapClickForCoord);
    mapBox.style.cursor = 'default';
    
    const hint = document.querySelector('.coord-hint');
    if (hint) {
        hint.remove();
    }
    
    setTimeout(() => {
        document.querySelector('.tab-btn[data-view="admin"]').click();
    }, 300);
}

function bindAdminForm() {
    updateAutoImageNumber();
    
    const form = document.getElementById('addForm');
    if (!form) return;
    form.addEventListener('submit', e => {
        e.preventDefault();
        const name = document.getElementById('a_name').value;
        const img = parseInt(document.getElementById('a_img').value);
        const x = parseInt(document.getElementById('a_x').value);
        const y = parseInt(document.getElementById('a_y').value);
        const desc = document.getElementById('a_desc').value;
        const story = document.getElementById('a_story').value;
        const method = document.getElementById('a_method').value;
        const summary = document.getElementById('a_summary').value;
        const types = [];
        document.querySelectorAll('input[name="types"]:checked').forEach(cb => types.push(cb.value));
        const newId = buildings.length > 0 ? Math.max(...buildings.map(b => b.id)) + 1 : 1;
        const newItem = { 
            id: newId, 
            name, 
            types, 
            img, 
            x, 
            y, 
            desc, 
            story, 
            method, 
            summary,
            imgs: [`./building/${String(newId).padStart(2, '0')}-01.jpg`, `./building/${String(newId).padStart(2, '0')}-02.jpg`, `./building/${String(newId).padStart(2, '0')}-03.jpg`]
        };
        buildings.push(newItem);
        // 保存当前添加的建筑用于导出
        currentAddedBuilding = newItem;
        renderMap();
        renderList();
        renderCategory();
        updateAutoImageNumber();
        document.getElementById('a_x').value = '';
        document.getElementById('a_y').value = '';
        document.getElementById('coord-x').textContent = '未选择';
        document.getElementById('coord-y').textContent = '未选择';
        alert('添加成功！请下载数据文件保存到本地。');
        form.reset();
        updateAutoImageNumber();
    });
}

// 导出当前添加的建筑数据
function exportCurrentBuilding() {
    if (!currentAddedBuilding) {
        alert('请先添加一个建筑后再导出！');
        return;
    }
    
    const fileName = `${currentAddedBuilding.id}.js`;
    const dataStr = `const buildingData${currentAddedBuilding.id} = [\n${JSON.stringify(currentAddedBuilding, null, 2)}\n];`;
    downloadFile(dataStr, fileName, 'application/javascript');
}

// 导出全部建筑数据
function exportAllBuildings() {
    if (buildings.length === 0) {
        alert('暂无数据可导出！');
        return;
    }
    
    const maxId = Math.max(...buildings.map(b => b.id));
    const fileName = `buildings${maxId}.js`;
    const dataStr = `const buildingData = [\n${buildings.map(b => JSON.stringify(b, null, 2)).join(',\n')}\n];`;
    downloadFile(dataStr, fileName, 'application/javascript');
}

// 导出更新后的数据（用于详情页按钮）
function exportUpdatedJson() {
    if (buildings.length === 0) {
        alert('暂无数据可导出！');
        return;
    }
    
    const fileName = `buildings.js`;
    const dataStr = `const buildingData = [\n${buildings.map(b => JSON.stringify(b, null, 2)).join(',\n')}\n];`;
    downloadFile(dataStr, fileName, 'application/javascript');
}

// 下载文件辅助函数
function downloadFile(content, fileName, contentType) {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// 渲染图片轮播
function renderCarousel(building) {
    const track = document.getElementById('carousel-track');
    const carousel = document.getElementById('detail-carousel');
    
    console.log('📷 renderCarousel called:', building ? building.name : 'null');
    console.log('📷 track:', track);
    console.log('📷 carousel:', carousel);
    
    if (!track || !carousel) return;
    
    track.innerHTML = '';
    
    console.log('📷 building.imgs:', building ? building.imgs : 'no building');
    
    if (!building || !building.imgs || !Array.isArray(building.imgs) || building.imgs.length === 0) {
        console.log('📷 隐藏轮播');
        carousel.style.display = 'none';
        return;
    }
    
    console.log('📷 显示轮播，图片数量:', building.imgs.length);
    carousel.style.display = 'block';
    
    const validImgs = [];
    building.imgs.forEach((imgPath, index) => {
        const slide = document.createElement('div');
        slide.className = 'carousel-slide';
        
        const img = document.createElement('img');
        img.src = imgPath;
        img.alt = building.name;
        img.onerror = function() {
            slide.style.display = 'none';
        };
        
        const caption = document.createElement('div');
        caption.className = 'slide-caption';
        caption.textContent = building.name;
        
        slide.appendChild(img);
        slide.appendChild(caption);
        track.appendChild(slide);
        
        validImgs.push({ slide, imgPath });
    });
    
    if (validImgs.length === 0) {
        carousel.style.display = 'none';
        return;
    }
    
    currentSlide = 0;
    updateCarousel();
    
    if (playInterval) {
        clearInterval(playInterval);
    }
    
    playInterval = setInterval(() => {
        const slides = track.querySelectorAll('.carousel-slide');
        const visibleSlides = Array.from(slides).filter(s => s.style.display !== 'none');
        
        if (visibleSlides.length === 0) return;
        
        currentSlide++;
        updateCarousel();
    }, 5000);
}

// 更新轮播显示
function updateCarousel() {
    const track = document.getElementById('carousel-track');
    if (!track) return;
    
    const slides = track.querySelectorAll('.carousel-slide');
    const visibleSlides = Array.from(slides).filter(s => s.style.display !== 'none');
    
    if (visibleSlides.length === 0) return;
    
    track.style.transition = 'transform 0.5s ease';
    track.style.transform = `translateY(-${currentSlide * 100}%)`;
    
    if (currentSlide >= visibleSlides.length) {
        setTimeout(() => {
            track.style.transition = 'none';
            currentSlide = 0;
            track.style.transform = `translateY(0)`;
        }, 500);
    }
}

window.lockMap = lockMap;
window.buildings = buildings;

// 初始化应用
function initializeApp() {
    console.log('========================================');
    console.log('📄 开始初始化应用...');
    
    // 优先使用合并后的数据
    if (typeof allBuildingData !== 'undefined' && allBuildingData.length > 0) {
        buildings = allBuildingData;
        console.log(`📥 使用合并数据: ${allBuildingData.length} 个建筑`);
    } else if (typeof buildingData !== 'undefined') {
        // 备用方案：使用原始 buildingData
        buildings = buildingData;
        console.log(`📥 使用原始数据: ${buildingData.length} 个建筑`);
    } else {
        console.error('❌ 没有找到任何数据！');
        return;
    }
    
    console.log('🚀 初始化组件...');
    init();
    console.log('✅ 初始化完成');
}

// 监听数据加载完成事件（用于动态添加数据后刷新）
window.addEventListener('buildingDataLoaded', function(e) {
    console.log(`📢 数据更新: ${e.detail.count} 个建筑`);
    buildings = allBuildingData;
    renderMap();
    renderList();
    renderCategory();
});

// 等待数据加载完成后再初始化
function handleDataLoaded() {
    // 等待所有资源（包括CSS）加载完成后再初始化
    if (document.readyState === 'complete') {
        initializeApp();
    } else {
        window.addEventListener('load', () => {
            initializeApp();
        });
    }
    // 移除事件监听，避免重复触发
    window.removeEventListener('buildingDataLoaded', handleDataLoaded);
}

// 监听数据加载完成事件
window.addEventListener('buildingDataLoaded', handleDataLoaded);

// 如果数据已经加载完成，直接初始化
if (window.allBuildingData && window.allBuildingData.length > 0) {
    if (document.readyState === 'complete') {
        initializeApp();
    } else {
        window.addEventListener('load', () => {
            initializeApp();
        });
    }
} else {
    // 页面加载完成后检查一次
    document.addEventListener('DOMContentLoaded', () => {
        if (window.allBuildingData && window.allBuildingData.length > 0) {
            if (document.readyState === 'complete') {
                initializeApp();
            } else {
                window.addEventListener('load', () => {
                    initializeApp();
                });
            }
        }
    });
}