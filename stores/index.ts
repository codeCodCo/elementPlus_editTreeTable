import { defineStore } from 'pinia';
import _ from 'lodash';
// 定义项目管理stores
export const useTsk = defineStore('task', {
	state: () => ({
		ppData: [],
		count: 0,
		otherPPdata: [],
		DomData: [],
	}),
	actions: {
		setOPPData(newNode) {
			this.otherPPdata = _.cloneDeep(newNode);
		},
		setPPData(parentId, newNode) {
			let cloneData = _.cloneDeep(this.otherPPdata);
			let index = cloneData.findIndex((v) => v.id == parentId);
			// 把新加载的数据插入到指定位置
			if (index > -1) {
				cloneData.splice(index + 1, 0, ...newNode);
				// 重新排序打标记
				cloneData.forEach((v, i) => {
					v.ppSort = i;
				});
				// debugger;
				this.otherPPdata = cloneData;
			}
		},
		removePPData(parentId) {
			let cloneData = _.cloneDeep(this.otherPPdata);
			// debugger;
			cloneData.forEach((element, index) => {
				if (element.parentId == parentId) {
					cloneData.splice(index, 1);
				}
			});
			// 删除完后重新排序
			cloneData.forEach((v, i) => {
				v.ppSort = i;
			});
			this.otherPPdata = cloneData;
		},

		// // 存储Dom堆栈
		// setDomData(dom,ref) {
		// 	// toDO:收起时：找到父级DOM节点 把该父级节点下的所有子节点收入缓存中 存储结构[key:Dom] 要做判重
		// 	const tbody = ref?.value?.$el.querySelector('.el-table .el-table__body-wrapper .el-scrollbar__wrap tbody');
		// 	const elements = document.querySelectorAll('[class^=id]');
		// 	for (var i = tbody.rows.length - 1; i >= 0; --i) {
		// 		const prefixRegex = /^id/; // 正则表达式，匹配以"id"开头的字符串
		// 		if (tbody.rows[i].className.match(prefixRegex)) {
		// 			tbody.rows[i].remove();
		// 		}
		// 	}
		// 	this.DomData.push(dom);
		// },
		// getDomData(id,ref) {
		// 	// toDO:展开时：找到父级DOM节点 把缓存中的DOM插入到父级节点之后
		// },
		// 取DOM堆栈
	},
});
if (import.meta.hot) {
	import.meta.hot.accept(acceptHMRUpdate(useTsk, import.meta.hot));
}
