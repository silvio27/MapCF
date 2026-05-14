// 数据加载器 - 合并数据
(function() {
    // 存储所有加载的数据
    window.allBuildingData = [];
    
    // 合并所有数据源的数据
    function mergeAllData() {
        const allData = [];
        
        // 遍历 window 对象，查找所有 buildingData 开头的数组变量
        for (const key in window) {
            if (key.startsWith('buildingData') && Array.isArray(window[key])) {
                console.log(`📦 发现数据源: ${key} (${window[key].length}条)`);
                allData.push(...window[key]);
            }
        }
        
        // 去重并按 id 排序
        const seen = new Set();
        window.allBuildingData = allData
            .filter(item => {
                if (!item || !item.id) return false;
                if (seen.has(item.id)) return false;
                seen.add(item.id);
                return true;
            })
            .sort((a, b) => a.id - b.id);
        
        console.log(`🎉 数据合并完成! 共 ${window.allBuildingData.length} 个建筑`);
        
        // 触发数据加载完成事件
        window.dispatchEvent(new CustomEvent('buildingDataLoaded', {
            detail: { count: window.allBuildingData.length }
        }));
    }
    
    // DOM 加载完成后开始合并数据
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', mergeAllData);
    } else {
        mergeAllData();
    }
})();
