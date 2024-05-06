<template>
	<div class="layout-padding" v-loading="loading">
		<div class="layout-padding-auto layout-padding-view">
			<el-row>
				<el-form-item label="项目名称">
					<ProjectSelect v-model="selectedId" @change="changeProject" :clearable="false" />
				</el-form-item>
			</el-row>
			<el-row>
				<div class="option-bar" style="width: 100%">
					<div>
						<el-button
							icon="folder-add"
							type="primary"
							:disabled="selectedId == '' || plan.state == 1"
							class="add-btn"
							@click="addPlan"
							v-auth="'progress_dpmTaskPlan_addPlan'"
						>
							新增任务
						</el-button>
						<el-button icon="delete" :disabled="selectedId == '' || plan.state == 1" class="add-btn" v-auth="'progress_dpmTaskPlan_batchDel'">
							批量删除
						</el-button>
						<el-button icon="Upload" :disabled="selectedId == '' || plan.state == 1" class="add-btn" v-auth="'progress_dpmTaskPlan_export'">
							导入文件
						</el-button>
					</div>
					<div class="ml10 mr20 right-bar">
						<span class="total">总任务数: {{ plan.taskCount }}</span>
						<span class="split-item">|</span>
						<div class="process-state" :class="plan.state == 1 ? 'process-state-active' : ''">
							<el-icon><Calendar /></el-icon>
							<span class="info-name">进度计划状态：</span><span class="state">{{ setPlanState }}</span>
						</div>
						<el-button v-show="plan.state == 0" type="primary" class="add-btn" @click="submitPlan" v-auth="'progress_dpmTaskPlan_submit'">
							提交
						</el-button>
						<el-button v-show="plan.state == 1" type="primary" class="add-btn" @click="editPlan" v-auth="'progress_dpmTaskPlan_planEdit'">
							编辑
						</el-button>
						<span class="split-item">|</span>
						<span class="submit-time">提交时间：{{ plan.publishTime != null && plan.publishTime != '' ? plan.publishTime : '--' }}</span>
					</div>
				</div>
			</el-row>
			<!-- v-loading="loading" -->
			<el-table
				:data="tableData"
				row-key="id"
				border
				stripe
				ref="editTreeTable"
				:key="forceUpdate"
				@expand-change="handleExpand"
				:expand-row-keys="expandRowKeys"
				:indent="20"
				@selection-change="handleSelectionChange"
				lazy
				:show-overflow-tooltip="true"
				:row-class-name="rowClassName"
				:load="loadData"
				:tree-props="{ children: 'children', hasChildren: 'hasChild' }"
			>
				<el-table-column type="selection" width="40px" align="center" />
				<el-table-column prop="nodeStr" label="标识号" width="180px" show-overflow-tooltip align="left" />
				<el-table-column prop="taskName" label="任务名称" width="280px" show-overflow-tooltip align="left">
					<template #default="{ row, $index }">
						<el-form :ref="`formRef${$index}ts`" v-show="row.isEdit" :model="row" class="flag-info-id">
							<el-form-item prop="taskName" :required="true" :rules="dataRules.taskName">
								<el-input v-model="row['taskName']" placeholder="请输入" autofocus ref="inputRef" :maxlength="255" />
								<span class="iddentity" style="width: 0; height: 0; visibility: hidden">{{ row.id }}-{{ row.sort }}-{{ row.parentId }}</span>
							</el-form-item>
						</el-form>
						<div v-show="!row.isEdit">{{ row['taskName'] }}</div>
					</template>
				</el-table-column>
				<el-table-column prop="taskDay" label="计划工期" width="100px" show-overflow-tooltip align="left">
					<template #default="{ row, $index }">
						<div>{{ row.taskDay != undefined ? row.taskDay + 'd' : '' }}</div>
					</template>
				</el-table-column>
				<el-table-column prop="planBeginDate" label="计划开始时间" width="165px" show-overflow-tooltip align="left">
					<template #default="{ row, $index }">
						<el-form :ref="`formRef${$index}ts`" v-show="row.isEdit" :model="row">
							<el-form-item prop="planBeginDate">
								<el-date-picker
									v-model="row.planBeginDate"
									value-format="YYYY-MM-DD"
									format="YYYY-MM-DD"
									clearable
									type="date"
									:disabled-date="(val) => startPickerOptionAct(val, row.planEndDate)"
									placeholder="请输入计划开始时间"
								/>
							</el-form-item>
						</el-form>
						<div v-show="!row.isEdit">{{ row['planBeginDate'] }}</div>
					</template>
				</el-table-column>
				<el-table-column prop="planEndDate" label="计划完成时间" width="165px" show-overflow-tooltip align="left">
					<template #default="{ row, $index }">
						<el-form :ref="`formRef${$index}ts`" v-show="row.isEdit" :model="row">
							<el-form-item prop="planEndDate">
								<el-date-picker
									v-model="row.planEndDate"
									value-format="YYYY-MM-DD"
									format="YYYY-MM-DD"
									clearable
									type="date"
									:disabled-date="(val) => endPickerOptionAct(val, row.planBeginDate)"
									placeholder="请输入计划完成时间"
								/>
							</el-form-item>
						</el-form>
						<div v-show="!row.isEdit">{{ row['planEndDate'] }}</div>
					</template>
				</el-table-column>
				<el-table-column prop="floor" label="关联楼栋" width="165px" show-overflow-tooltip align="left">
					<template #default="{ row, $index }">
						<div>{{ row.floor != null ? row.floor : '-' }}</div>
					</template>
				</el-table-column>
				<el-table-column prop="updateBy" label="修改人" min-width="100px" show-overflow-tooltip align="left" />
				<el-table-column prop="updateTime" label="修改时间" min-width="100px" show-overflow-tooltip align="left">
					<template #default="{ row, $index }">
						<div>{{ dayjs(row.updateTime).format('YYYY-MM-DD') }}</div>
					</template>
				</el-table-column>
				<el-table-column label="操作" width="380px" align="center" fixed="right">
					<template #default="scope">
						<el-tooltip class="box-item" :offset="0" effect="light" placement="top">
							<template #content><span style="color: #3668f7 !important">添加子项</span></template>
							<el-button
								v-show="!scope.row.isEdit"
								icon="connection"
								text
								type="primary"
								class="option-btn"
								:disabled="plan.state == 1"
								v-auth="'progress_dpmTaskPlan_add'"
								@click="addRow(scope.row, scope.$index)"
							></el-button>
						</el-tooltip>
						<el-tooltip class="box-item" :offset="0" effect="light" placement="top">
							<template #content><span style="color: #3668f7 !important">添加楼栋子项</span></template>
							<el-button
								v-show="!scope.row.isEdit"
								icon="OfficeBuilding"
								text
								class="option-btn"
								type="primary"
								:disabled="plan.state == 1"
								v-auth="'progress_dpmTaskPlan_add'"
								@click="addBuild(scope.row, scope.$index)"
							></el-button>
						</el-tooltip>
						<el-tooltip class="box-item" :offset="0" effect="light" placement="top">
							<template #content><span style="color: #3668f7 !important">复制</span></template>
							<el-button
								v-show="!scope.row.isEdit"
								icon="DocumentCopy"
								text
								class="option-btn"
								type="primary"
								:disabled="scope.row.floor != null || plan.state == 1"
								v-auth="'progress_dpmTaskPlan_add'"
								@click="copyRow(scope.row, scope.$index)"
							></el-button>
						</el-tooltip>
						<el-tooltip class="box-item" :offset="0" effect="light" placement="top">
							<template #content><span style="color: #3668f7 !important">编辑</span></template>
							<el-button
								v-show="!scope.row.isEdit"
								icon="edit"
								text
								class="option-btn"
								type="primary"
								:disabled="plan.state == 1"
								v-auth="'project_dpmBuild_edit'"
								@click="editRow(scope.row, scope.$index)"
							></el-button>
						</el-tooltip>
						<el-tooltip class="box-item" :offset="0" effect="light" placement="top">
							<template #content><span style="color: #3668f7 !important">删除</span></template>
							<el-button
								v-show="!scope.row.isEdit"
								icon="delete"
								text
								class="option-btn"
								type="primary"
								:disabled="plan.state == 1"
								v-auth="'progress_dpmTaskPlan_del'"
								@click="delRow(scope.row, scope.$index)"
							>
							</el-button>
						</el-tooltip>
						<el-tooltip class="box-item" :offset="0" effect="light" placement="top">
							<template #content><span style="color: #3668f7 !important">保存</span></template>
							<el-button
								v-show="scope.row.isEdit"
								icon="check"
								text
								class="option-btn"
								type="primary"
								v-auth="'project_dpmBuild_edit'"
								@click="saveRow(`formRef${scope.$index}ts`, scope.row)"
							></el-button>
						</el-tooltip>
						<el-tooltip class="box-item" :offset="0" effect="light" placement="top">
							<template #content><span style="color: #3668f7 !important">取消</span></template>
							<el-button
								v-show="scope.row.isEdit"
								icon="close"
								text
								class="option-btn"
								type="primary"
								v-auth="'project_dpmBuild_edit'"
								@click="cancelRow(scope.row, scope.$index)"
							></el-button>
						</el-tooltip>
						<el-tooltip class="box-item" :offset="0" effect="light" placement="top">
							<template #content><span style="color: #3668f7 !important">上移</span></template>
							<el-button
								v-show="!scope.row.isEdit"
								icon="ArrowUp"
								text
								class="option-btn"
								:disabled="plan.state == 1"
								type="primary"
								v-auth="'project_dpmBuild_edit'"
								@click="upRow(scope.row, scope.$index)"
							></el-button
						></el-tooltip>
						<el-tooltip class="box-item" :offset="0" effect="light" placement="top">
							<template #content><span style="color: #3668f7 !important">下移</span></template>
							<el-button
								v-show="!scope.row.isEdit"
								icon="ArrowDown"
								text
								class="option-btn"
								:disabled="plan.state == 1"
								type="primary"
								v-auth="'project_dpmBuild_edit'"
								@click="downRow(scope.row, scope.$index)"
							></el-button
						></el-tooltip>
					</template>
				</el-table-column>
			</el-table>
			<form-dialog ref="formDialogRef" :reload="reloadPlanInfo" :reloadTree="reloadTree" />
		</div>
	</div>
</template>

<script setup lang="ts">
import ProjectSelect from '/@/components/ProjectSelector/index.vue';
import { fetchList, deleteTask, add, putObj, publish, move, versionEdit } from '/@/api/task/taskPlan';
import { useMessage, useMessageBox } from '/@/hooks/message';
import { ElMessage, ElMessageBox, dayjs } from 'element-plus';
import Sortable from 'sortablejs';
import _ from 'lodash';
import { useTsk } from './stores/index';
const store = useTsk();
const FormDialog = defineAsyncComponent(() => import('./formDialog.vue'));

const editTreeTable = ref();
const editTreeTableVal = ref([]);

const tableData = ref([]);
const plan = ref({ state: 0, publishTime: '', taskCount: 0, versionIdVal: '' });

const selectedId = ref('');
const searchSource = ref([]);

const loading = ref(false);
const formDialogRef = ref();
const parentRow = ref();
const isAddRow = ref([]);
const idIntendy = ref(null);
// 定义变量内容
const context = getCurrentInstance();
const setPlanState = computed(() => {
	if (plan.value.state != null) {
		return plan.value.state == 0 ? '待提交' : '已生效';
	} else {
		return '待提交';
	}
});
const unTestVal = ref([
	'versionId',
	'realBeginDate',
	'realEndDate',
	'preTask',
	'floor',
	'linkProcessCurrentDate',
	'linkProcessCurrentState',
	'linkProcessId',
	'childCount',
	'taskDay',
	'id',
	'isTemp',
	'hasChild',
	'isEdit',
	'add',
	'versionId',
	'projectId',
	'planBeginDate',
	'planEndDate',
]);
const expandRowKeys = ref([]);
const cloneRow = ref(null);
const forceUpdate = ref(0);
// 先new一个map用于数据保存
const rowMaps = reactive(new Map());
const expandrowKeysall = ref([]);
const allExpandRows = ref([]);
const firstRow = ref({});
const copyFirstAllRow = ref([]);
// const predicate = (node, query) => {
// 	if (node?.filterName.indexOf(query) > -1) {
// 		return true;
// 	} else {
// 		return false;
// 	}
// };
// 虚拟列表
const copyElement = ref(null);
const dataRules = ref({
	taskName: [{ required: true, message: '任务名称不能为空', trigger: 'blur' }],
});

// 实际开始-实际结束
const startPickerOptionAct = (time, begin) => {
	if (begin != '' && begin != null) {
		var date = new Date(begin);
		time.setHours(0, 0, 0, 0);
		return time.getTime() > date.getTime();
	}
};
const endPickerOptionAct = (time, end) => {
	// 禁用结束日期之前的所有日期
	if (end != '' && end != null) {
		var date = new Date(end);
		time.setHours(0, 0, 0, 0);
		return time.getTime() < date.getTime();
	}
};

const rowClassName = (tag) => {
	// 给第一级行 设置类名 用于sortable的draggable字段，指定类可排序
	// let index = expandrowKeysall.value.findIndex((v) => v == tag.row.id);
	if (plan.value.state == 1) {
		return 'otherItem';
	} else {
		return 'id' + tag.row.id + '-' + 'pid' + tag.row.parentId;
	}
};

// 虚拟列表
const elementVir = () => {};
const domContent = ref({});
const handleExpand = (row, expanded) => {
	// console.log(domContent.value);
	// 一级行实现手风琴
	// debugger;
	// elementVir();
	if (row?.isTop) {
		expandRowKeys.value = expanded ? [row.id] : [];
		firstRow.value = row;
	}
	let index = expandrowKeysall.value.findIndex((v) => v == row.id);
	if (expanded) {
		if (index == -1) {
			expandrowKeysall.value.push(row.id);
		}
	} else {
		expandrowKeysall.value.splice(index, 1);
	}
	allExpandRows.value = [];
	copyFirstAllRow.value.forEach((v) => {
		if (row.children && v.children) {
			if (v.id == row.id && row.children.length == v.children.length) {
				// 更新最新数据
				v.children = row.children;
			}
		}
	});
	allExpandRows.value.push(...copyFirstAllRow.value);
	// allExpandRows.value = copyFirstAllRow.value;
	// let cloneDatas = _.cloneDeep(allExpandRows.value); // 防止数据污染
	expandrowKeysall.value.forEach((v) => {
		let versionId: string = plan.value.versionIdVal;
		let params = {
			id: row.projectId,
			parentId: v,
			versionId: versionId,
		};
		fetchList(params).then((res) => {
			res.data.taskPlanInfoList.map((v) => {
				if (v.parentId == '0') {
					v.isTop = true;
				}
			});
			allExpandRows.value.push(...res.data.taskPlanInfoList);
		});
	});
	// if (expanded) {
	// 	// 展开时
	// 	const tbody = editTreeTable?.value?.$el.querySelector('.el-table .el-table__body-wrapper .el-scrollbar__wrap tbody');
	// 	for (var i = tbody.rows.length - 1; i >= 0; --i) {
	// 		let elSel = -1;
	// 		tbody.rows[i].classList.forEach((dl, index) => {
	// 			if (dl.includes('id')) {
	// 				elSel = index;
	// 				return false;
	// 			}
	// 		});
	// 		if (elSel > -1) {
	// 			let text = tbody.rows[i].classList[elSel];
	// 			// var inputString = 'id1752223534346772482-pid0';
	// 			// 使用正则表达式匹配id后面的数字，不包括-pid0
	// 			let match = text.match(/id(\d+)-pid0/);

	// 			if (match) {
	// 				let idNumber = match[1];
	// 				if (idNumber == row.id) {
	// 					// 获取 HTMLCollection
	// 					//  取值还不太成熟

	// 					if (tbody.rows[i] && tbody.rows[i].parentNode) {
	// 						if (tbody.rows[i].nextSibling) {
	// 							// 如果有下一个兄弟节点，插入在下一个兄弟节点之前
	// 							// console.log();
	// 							if (domContent.value[row.id] != undefined) {
	// 								tbody.rows[i].parentNode.insertBefore(domContent.value[row.id], tbody.rows[i].nextSibling);
	// 							}
	// 						} else {
	// 							// 如果没有下一个兄弟节点，直接追加到父节点的末尾
	// 							tbody.rows[i].parentNode.appendChild(domContent.value[row.id]);
	// 						}
	// 					}
	// 				}
	// 			}
	// 		}
	// 	}
	// } else {
	// 	// 收起时
	// 	if (!domContent.value.hasOwnProperty(row.id)) {
	// 		const tbody = editTreeTable?.value?.$el.querySelector('.el-table .el-table__body-wrapper .el-scrollbar__wrap tbody');
	// 		for (var i = tbody.rows.length - 1; i >= 0; --i) {
	// 			let elSel = -1;
	// 			tbody.rows[i].classList.forEach((dl, index) => {
	// 				if (dl.includes('id')) {
	// 					elSel = index;
	// 					return false;
	// 				}
	// 			});
	// 			if (elSel > -1) {
	// 				let text = tbody.rows[i].classList[elSel];
	// 				let pattern = /pid(\d+)/;

	// 				let match = pattern.exec(text);

	// 				if (match) {
	// 					let pidNumber = match[1];
	// 					if (pidNumber == row.id) {
	// 						domContent.value[row.id] = tbody.rows[i];
	// 						tbody.rows[i].remove();
	// 					}
	// 				}
	// 			}
	// 		}
	// 	}
	// }
};

onMounted(() => {
	document.body.ondrop = function (event) {
		event.preventDefault();
		event.stopPropagation();
	};
	// nextTick(() => {
	// 	const tbody = editTreeTable?.value?.$el.querySelector('.el-table .el-table__body-wrapper .el-scrollbar__wrap tbody');
	// 	rowDrop(tbody);
	// });
	editTreeTable.value.store?.updateTableScrollY();
});

// 上移
const upRow = (row, index) => {
	row.newSort = _.parseInt(row.sort) - 1;
	// debugger;
	if (row.newSort > 0) {
		moveNode(row);
	} else {
		useMessage().wraning('已经是第一个节点了');
	}
};

// 下移
const downRow = (row, index) => {
	// debugger;
	if (row.parentId == '0') {
		let i = copyFirstAllRow.value.findIndex((v) => v.id == row.id);
		if (i > -1) {
			row.newSort = _.parseInt(row.sort) + 1;
			if (row.newSort <= copyFirstAllRow.value.length) {
				if (editTreeTable.value.store.states.treeData.value[row.id] != undefined) {
					editTreeTable.value.store.states.treeData.value[row.id].expanded = true;
				}
				moveNode(row);
			} else {
				useMessage().wraning('已经是最后一个节点了');
			}
		}
	} else {
		let i = allExpandRows.value.findIndex((v) => v.id == row.parentId);
		if (i > -1) {
			row.newSort = _.parseInt(row.sort) + 1;
			if (row.newSort <= allExpandRows.value[i].childCount) {
				if (editTreeTable.value.store.states.treeData.value[row.id] != undefined) {
					editTreeTable.value.store.states.treeData.value[row.id].expanded = true;
				}
				moveNode(row);
			} else {
				useMessage().wraning('已经是最后一个节点了');
			}
		}
	}
};

// 同级移动
// 同级移动
// const moveNode = async (row) => {
// 	// debugger;
// 	loading.value = true;
// 	try {
// 		await move({ id: row.id, newSort: row.newSort });
// 		if (row.parentId == '0') {
// 			tableData.value = [];
// 			getDatas(selectedId.value, 0);
// 		} else {
// 			// editTreeTable.value.toggleRowExpansion(row, true);
// 			debugger;
// 			editTreeTable.value.store.states.treeData.value[row.parentId].lazy = false;
// 			editTreeTable.value.store.states.treeData.value[row.parentId].children = [];
// 			editTreeTable.value.store.states.treeData.value[row.parentId].loaded = true;
// 			editTreeTable.value.store.states.treeData.value[row.parentId].expanded = false;
// 			let { tree, treeNode, resolve } = rowMaps.get(row.parentId);
// 			loadData(tree, treeNode, resolve);
// 			loading.value = false;
// 		}
// 	} catch {
// 		loading.value = false;
// 		return;
// 	} finally {
// 		loading.value = false;
// 		useMessage().success('排序成功');
// 		// let versionId: string = plan.value.versionIdVal;
// 		// let params = {
// 		// 	id: row.projectId,
// 		// 	parentId: row.id,
// 		// 	versionId: versionId,
// 		// };
// 		// fetchList(params).then((res) => {
// 		// 	setInfo(res);
// 		// 	if (res.data.taskPlanInfoList != null) {
// 		// 		res.data.taskPlanInfoList.map((v) => {
// 		// 			v.add = false;
// 		// 			v.isEdit = false;
// 		// 			v.isTemp = false;
// 		// 			if (v.parentId == '0') {
// 		// 				v.isTop = true;
// 		// 			}
// 		// 		});
// 		// 	}

// 		// 	row.children = JSON.parse(JSON.stringify(res.data.taskPlanInfoList));

// 		// 	editTreeTable.value.store.states.treeData.value[row.parentId].children = [
// 		// 		...row.children.map((v) => {
// 		// 			return { id: v.id, lazy: false, loaded: true, expanded: false };
// 		// 		}),
// 		// 	];
// 		// });
// 	}
// };

// const moveNode = async (row) => {
// 	// debugger;
// 	loading.value = true;
// 	try {
// 		await move({ id: row.id, newSort: row.newSort });
// 		if (row.parentId == '0') {
// 			tableData.value = [];
// 			getDatas(selectedId.value, 0);
// 		} else {
// 			tableData.value = [];
// 			getDatas(selectedId.value, 0);
// 			editTreeTable.value.store.states.treeData.value[row.id].loaded = false;
// 			editTreeTable.value.store.states.treeData.value[row.id].expanded = false;
// 			editTreeTable.value.store.states.treeData.value[row.dropId].loaded = false;
// 			editTreeTable.value.store.states.treeData.value[row.dropId].expanded = false;
// 			editTreeTable.value.store.states.treeData.value[row.id].children = [];
// 			editTreeTable.value.store.states.treeData.value[row.dropId].children = [];
// 			const tbody = editTreeTable?.value?.$el.querySelector('.el-table .el-table__body-wrapper .el-scrollbar__wrap tbody');
// 			for (var i = tbody.rows.length - 1; i >= 0; --i) {
// 				let elSel = -1;
// 				tbody.rows[i].classList.forEach((dl, index) => {
// 					if (dl.includes('id')) {
// 						elSel = index;
// 						return false;
// 					}
// 				});
// 				if (elSel > -1) {
// 					let text = tbody.rows[i].classList[elSel];
// 					let pattern = /pid(\d+)/;

// 					let match = pattern.exec(text);

// 					if (match) {
// 						let pidNumber = match[1];
// 						if (pidNumber == row.id) {
// 							tbody.rows[i].remove();
// 						}
// 					}
// 				}
// 			}
// 		}
// 	} catch {
// 		loading.value = false;
// 		return;
// 	} finally {
// 		useMessage().success('排序成功');
// 		nextTick(() => {
// 			const tbody = editTreeTable?.value?.$el.querySelector('.el-table .el-table__body-wrapper .el-scrollbar__wrap tbody');
// 			rowDrop(tbody);
// 		});
// 		loading.value = false;
// 	}
// };
// 同级移动
const moveNode = async (row) => {
	// debugger;
	loading.value = true;
	try {
		await move({ id: row.id, newSort: row.newSort });
		if (row.parentId == '0') {
			tableData.value = [];
			getDatas(selectedId.value, 0);
		} else {
			// editTreeTable.value.toggleRowExpansion(row, true);
			editTreeTable.value.store.states.treeData.value[row.parentId].loaded = false;
			editTreeTable.value.store.states.treeData.value[row.parentId].expanded = true;
			let { tree, treeNode, resolve } = rowMaps.get(row.parentId);
			loadData(tree, treeNode, resolve);
			loading.value = false;
		}
	} catch {
		loading.value = false;
		return;
	} finally {
		useMessage().success('排序成功');
	}
};

const rowDrop = (tbody) => {
	let sortRow = {
		id: '',
		newSort: '',
		dropId: '',
	};
	let allowDrag = false;
	Sortable.create(tbody, {
		// draggable: '.sortItem', // 拥有sortItem类名的行才能排序
		fallbackOnBody: true,
		filter: '.otherItem', // 过滤器，不需要进行拖动的元素
		animation: 150, // 拖拽延时，效果更好看
		chosenClass: 'sortable-chosen', // 被选中项的css 类名
		dragClass: 'sortable-drag', // 正在被拖拽中的css类名
		ghostClass: 'sortable-ghost',
		forceFallback: false,
		onMove: (e: any) => {
			// 被拖拽的元素

			var expArr = _.cloneDeep(expandrowKeysall.value);
			var dragEl = e.dragged.querySelectorAll('.iddentity');
			var dragElIdSort = dragEl[0].innerHTML;
			let dragArr = dragElIdSort.split('-');
			let dragId = dragArr[0];
			let dragSort = dragArr[1];
			let dragParentId = dragArr[2];
			let index = expandrowKeysall.value.findIndex((v) => v == dragId);
			if (index > -1) {
				expandrowKeysall.value.splice(index, 1);
			}
			expandRowKeys.value = expandrowKeysall.value;
			// 被交换的元素
			var dropEl = e.related.querySelectorAll('.iddentity');
			var dropElIdSort = dropEl[0].innerHTML;
			let dropArr = dropElIdSort.split('-');
			let dropId = dropArr[0];
			let dropSort = dropArr[1];
			let dropParentId = dropArr[2];
			// if (expArr.includes(dropId) || expArr.includes(dragId)) {
			// 	throttle(() => {
			// 		useMessage().wraning('不允许拖拽展开列');
			// 	}, 800);
			// 	return false; // 不允许拖拽展开列
			// } else {
			if (dragParentId !== dropParentId) {
				// 移动的元素与新元素父级id不相同
				throttle(() => {
					useMessage().wraning('不允许跨级拖动');
				}, 800);
				return false; // 不允许跨级拖动
			} else {
				sortRow.id = dragId;
				sortRow.newSort = dropSort;
				sortRow.dropId = dropId;
				// 更新dom 交换并赋值新
				dragEl[0].innerHTML = dragId + '-' + dropSort + '-' + dragParentId;
				dropEl[0].innerHTML = dropId + '-' + dragSort + '-' + dropParentId;
				// 处理拖拽后的字节点
				// 拖拽元素的子项
				// 被拖拽元素的子项
				// if (editTreeTable.value.store.states.treeData.value[dragId] != undefined) {
				// 	editTreeTable.value.store.states.treeData.value[dragId].loaded = false;
				// 	editTreeTable.value.store.states.treeData.value[dragId].lazy = false;
				// 	editTreeTable.value.store.states.treeData.value[dragId].children = [];
				// 	editTreeTable.value.store.states.treeData.value[dragId].expanded = false;
				// }
			}
		},
		onEnd(evt: any) {
			// 被拖拽的元素
			nextTick(() => {
				// 下次渲染更新数据
				loading.value = false;
			});
			let index = allExpandRows.value.findIndex((v) => v.id == sortRow.id);
			if (index > -1) {
				allExpandRows.value[index].newSort = sortRow.newSort;
				moveNode(allExpandRows.value[index]); // 请求后端排序接口
			}
		},
	});
};

const activeRows = ref([]);
// 节流
const timer = ref(null);
function throttle(fn, delay = 300) {
	if (timer.value == null) {
		timer.value = setTimeout(() => {
			fn();

			clearTimeout(timer.value);
			timer.value = null;
		}, delay);
	}
}
// 防抖
function debounce(fn, delay = 300) {
	let timer = null;
	return function (...args) {
		if (timer != null) {
			clearTimeout(timer);
			timer = null;
		}
		timer = setTimeout(() => {
			fn.call(this, ...args);
		}, delay);
	};
}
watch(
	() => store.ppData,
	(newValue, oldValue) => {
		if (store.count == 0) {
			store.setOPPData(JSON.parse(JSON.stringify(newValue)));
		}
	},
	{ immediate: true }
);

// 切换项目
const changeProject = (e) => {
	selectedId.value = e;
	tableData.value = [];
	store.ppData = [];
	getDatas(e, 0);
	isAddRow.value = [];
	store.count = 0;
	allExpandRows.value = [];
	firstRow.value = {};
	expandRowKeys.value = [];
	editTreeTable.value.store.states.treeData.value = {};
};

const getDatas = (id, parentId) => {
	let versionId: string = plan.value.versionIdVal;
	loading.value = true;
	fetchList({ id, parentId, versionId }).then((res) => {
		if (res) {
			plan.value.state = res.data.state != null ? res.data.state : 0;
			plan.value.publishTime = res.data.publishTime != null ? res.data.publishTime : '';
			plan.value.taskCount = res.data.taskCount != null ? res.data.taskCount : 0;
			plan.value.versionIdVal = res.data.id != null ? res.data.id : '';
			if (res.data.taskPlanInfoList != null) {
				res.data.taskPlanInfoList.map((v) => {
					v.add = false;
					v.isEdit = false;
					v.isTemp = false;
					if (v.parentId == '0') {
						v.isTop = true;
					}
				});
				let ress = JSON.parse(JSON.stringify(res.data.taskPlanInfoList));
				//数据处理 添加编辑标识
				proTableData(ress);
				searchSource.value = ress;
				tableData.value = ress;
				// store.ppData = ress;
				allExpandRows.value = ress;
				copyFirstAllRow.value = ress;
				loading.value = false;
			} else {
				tableData.value = [];
				loading.value = false;
			}
		}
	});
	isAddRow.value = [];
};

const setRowData = (parentId) => {
	return {
		id: new Date().valueOf(),
		taskName: '',
		planBeginDate: '',
		planEndDate: '',
		parentId: parentId ? parentId : null,
		isEdit: true,
		add: true,
		hasChild: false,
		isTemp: true,
		versionId: plan.value.versionIdVal,
		projectId: selectedId.value,
		children: [],
	};
};

// 新增计划 父级
const addPlan = () => {
	if (isAddRow.value.length == 0) {
		let newNode = {
			id: new Date().valueOf(),
			taskName: '',
			planBeginDate: '',
			planEndDate: '',
			isEdit: true,
			add: true,
			hasChild: false,
			isTemp: true,
			versionId: plan.value.versionIdVal,
			projectId: selectedId.value,
			isTop: true,
		};
		tableData.value.push(newNode);
		isAddRow.value.push('1');
	} else {
		useMessage().wraning('请保存后再继续添加节点');
	}
};

// 添加楼栋信息
const addBuild = (row, index) => {
	formDialogRef.value.openDialog(row);
	parentRow.value = row;
};

// 添加子项
const addRow = async (row, index) => {
	// debugger;
	if (isAddRow.value.length == 0) {
		//新增行数据
		let addrow = setRowData(row.id);
		let noder = reactive(addrow);
		// 给父级复制保存
		parentRow.value = row;
		// editTreeTable.value.store.loadOrToggle(row);
		//新增
		if (row.hasChild) {
			row.children = row.children != undefined ? row.children : [];
			row.children.push(noder);
		} else {
			//添加数据
			row.hasChild = true;
			row.children = [noder];
		}

		// 解决新增抖动问题
		let isDubbleArr = [];

		row.children.forEach((v) => {
			if (v.add) {
				isDubbleArr.push(v.id);
			}
		});

		if (isDubbleArr.length > 1) {
			let isis = row.children.findIndex((df) => df.id == isDubbleArr[0]);
			if (isis > -1) {
				row.children.splice(isis, 1);
			}
		}
		if (expandrowKeysall.value.includes(row.id)) {
			editTreeTable.value.store.states.lazyTreeNodeMap.value[row.id] = [];
			editTreeTable.value.store.states.lazyTreeNodeMap.value[row.id].push(...row.children);
		}
		nextTick(() => {
			let versionId: string = plan.value.versionIdVal;
			let params = {
				id: row.projectId,
				parentId: row.id,
				versionId: versionId,
			};
			fetchList(params).then((res) => {
				setInfo(res);
				if (res.data.taskPlanInfoList != null) {
					res.data.taskPlanInfoList.map((v) => {
						v.add = false;
						v.isEdit = false;
						v.isTemp = false;
						if (v.parentId == '0') {
							v.isTop = true;
						}
					});
				}

				editTreeTable.value.toggleRowExpansion(row, true);
				editTreeTable.value.store.states.treeData.value[row.id].loaded = false;
				editTreeTable.value.store.states.treeData.value[row.id].expanded = true;
				row.children = JSON.parse(JSON.stringify(res.data.taskPlanInfoList));
				row.children = [...row.children, noder];
				editTreeTable.value.store.states.lazyTreeNodeMap.value[row.id] = [];

				editTreeTable.value.store.states.lazyTreeNodeMap.value[row.id].push(...row.children);
				isAddRow.value.push('1');
			});
		});
		// elTableScrollToRow(editTreeTable?.value, row);
		// //展开行
		// nextTick(() => {
		// 	if (row.hasChild) {
		// 			editTreeTable.value.toggleRowExpansion(row, true);
		// 			editTreeTable.value.store.states.treeData.value[row.id].loaded = false;
		// 			editTreeTable.value.store.states.treeData.value[row.id].expanded = true;

		// 			// editTreeTable.value.store.loadOrToggle(row);
		// 			addrow.isEdit = true;

		// 		});
		// 	}

		// 	isAddRow.value.push('1');
		// 	// editTreeTable.value.store.states.treeData.value[row.id].loaded = false;
		// 	// let { tree, treeNode, resolve } = rowMaps.get(row.id);

		// 	// 源码bug，需要先置空
		// 	// loadData(tree, treeNode, resolve);
		// 	//更新后打开节点
		// 	// editTreeTable.value.toggleRowExpansion(row, true);
		// 	// editTreeTable.value.store.states.treeData.value[row.id].loaded = false;
		// 	// 数据处理完成后 加载数据并展开父节点
		// 	// debugger;
		// 	// editTreeTable.value.store.loadOrToggle(row);
		// 	//刷新树
		// 	// refTable();
		// });
	} else {
		useMessage().wraning('请保存后再继续添加节点');
	}
};

// 更新树
const updateTableTree = (parent, nodes) => {
	editTreeTable.value.store.states.lazyTreeNodeMap[parent.id] = nodes;
};

const refTable = () => {
	function dg(data) {
		for (let i in data) {
			if (data[i].children) {
				updateTableTree(data[i], data[i].children);
				dg(data[i].children);
			}
		}
	}
	dg(tableData.value);
};

const editRow = (row, index) => {
	//编辑
	cloneRow.value = _.cloneDeep(row);
	row.isEdit = true;
};

// 刷新版本信息
const reloadPlanInfo = (id, parentId) => {
	let versionId: string = plan.value.versionIdVal;
	fetchList({ id, parentId, versionId }).then((res) => {
		if (res) {
			plan.value.state = res.data.state != null ? res.data.state : 0;
			plan.value.publishTime = res.data.publishTime != null ? res.data.publishTime : '';
			plan.value.taskCount = res.data.taskCount != null ? res.data.taskCount : 0;
			plan.value.versionIdVal = res.data.id != null ? res.data.id : '';
		}
	});
};

// 复制后刷新节点信息
const reloadNode = (row) => {
	let versionId: string = plan.value.versionIdVal;
	fetchList({ id: row.projectId, parentId: row.parentId, versionId }).then((res) => {
		if (res) {
			res.data.taskPlanInfoList.map((v) => {
				v.add = false;
				v.isEdit = false;
				v.isTemp = false;
				if (v.parentId == '0') {
					v.isTop = true;
				}
			});
			if (row.parentId != '0') {
				// row.children = res.data.taskPlanInfoList;
				// editTreeTable.value.store.loadOrToggle(row);
				let { tree, treeNode, resolve } = rowMaps.get(row.parentId);
				loadData(tree, treeNode, resolve);
			} else {
				tableData.value = [];
				tableData.value = res.data.taskPlanInfoList;
				// editTreeTable.value.store.loadOrToggle(row);
			}
		}
	});
};

// 刷新树节点
const reloadTree = (row) => {
	// debugger;
	row.hasChild = true;
	// row.children = [];

	nextTick(() => {
		let versionId: string = plan.value.versionIdVal;
		let params = {
			id: row.projectId,
			parentId: row.id,
			versionId: versionId,
		};
		fetchList(params).then((res) => {
			setInfo(res);
			if (res.data.taskPlanInfoList != null) {
				res.data.taskPlanInfoList.map((v) => {
					v.add = false;
					v.isEdit = false;
					v.isTemp = false;
				});
			}
			editTreeTable.value.toggleRowExpansion(row, true);
			editTreeTable.value.store.states.treeData.value[row.id].loaded = false;
			editTreeTable.value.store.states.treeData.value[row.id].expanded = true;
			row.children = JSON.parse(JSON.stringify(res.data.taskPlanInfoList));
			editTreeTable.value.store.states.lazyTreeNodeMap.value[row.id] = [];
			editTreeTable.value.store.states.lazyTreeNodeMap.value[row.id].push(...row.children);
		});
	});
};

// 复制
const copyRow = async (row, index) => {
	// 任务名称、计划工期、计划开始时间、计划结束时间
	let newRow = _.cloneDeep(row);
	Reflect.deleteProperty(newRow, 'id');

	if (newRow.parentId == '0') {
		Reflect.deleteProperty(newRow, 'parentId');
	}
	// newRow.id = new Date().valueOf();
	// debugger;
	try {
		// loading.value = true;
		await add(newRow);
		row.isEdit = false;
		reloadPlanInfo(row.projectId, row.parentId);
		reloadNode(row);
		useMessage().success('复制成功');
	} catch (err: any) {
		useMessage().wraning(err);
	}
};

const delRow = (row, index) => {
	//删除行
	// debugger;
	let delArr = [];
	function dg(data) {
		for (let i in data) {
			//过滤当前新增的数据
			if (!data[i].add) {
				delArr.push(data[i].id);
			}
			if (data[i].children) {
				dg(data[i].children);
			}
		}
	}
	dg([row]);
	//删除
	useMessageBox()
		.confirm(`删除选中的 ${row.taskName} 数据项?如果有子项,也会一并删除!`)
		.then(async () => {
			if (delArr.length > 0) {
				//删除接口
				await deleteTask(row.id);
				useMessage().success('删除成功');
				// getDatas(selectedId.value, row.parentId);
				if (row.isTop) {
					getDatas(selectedId.value, 0);
				} else {
					// getDatas(selectedId.value, 0);
					// expandRowKeys.value = expandrowKeysall.value;
					// editTreeTable.value.store.states.treeData.value[row.parentId].loaded = false;
					// editTreeTable.value.store.states.treeData.value[row.parentId].expanded = true;
					// editTreeTable.value.store.states.treeData.value[row.parentId].children = [];
					editTreeTable.value.store.updateCurrentRowData();
					editTreeTable.value.store.updateExpandRows();
					editTreeTable.value.store?.updateTableScrollY();
					// // debugger;
					// let index = allExpandRows.value.findIndex((v) => v.id == row.parentId);
					// if (index > -1) {
					// 	editTreeTable.value.toggleRowExpansion(allExpandRows.value[index], true);
					// 	editTreeTable.value.store.loadOrToggle(allExpandRows.value[index]);
					// }

					// let { tree, treeNode, resolve } = rowMaps.get(row.parentId);
					// loadData(tree, treeNode, resolve);
					// debugger;
					let rowindex = allExpandRows.value.findIndex((t) => t.id == row.parentId);
					if (rowindex > -1) {
						let parent = JSON.parse(JSON.stringify(allExpandRows.value[rowindex]));
						// let index = parent.children.findIndex((v) => v.id == row.id);
						// if (index > -1) {
						// 	parent.children.splice(index, 1);
						// }
						let indexs = editTreeTable.value.store.states.lazyTreeNodeMap.value[row.parentId].findIndex((v) => v.id == row.id);

						if (indexs > -1) {
							editTreeTable.value.store.states.lazyTreeNodeMap.value[row.parentId].splice(indexs, 1);
						}
						editTreeTable.value.store.states.treeData.value[row.parentId].expanded = true;
						editTreeTable.value.store.loadOrToggle(parent);
					}
				}
			} else {
				useMessage().wraning('999');
				// getDatas(selectedId.value, row.parentId);
			}
		})
		.catch(() => {});
};

// 表格效验触发器
const tableValidate = (refTel) => {
	const { refs } = context;
	let allPassValidate = [];
	// 这里是调用所有行的validate()方法
	if (refTel.includes('formRef')) {
		var reds = toRaw(refs[refTel]) as any;
		// reds.forEach((ssd) => {
		// 	ssd.validate((v) => {
		// 		if (v == false) allPassValidate.push('1');
		// 	});
		// });
		reds.validate((v) => {
			if (v == false) allPassValidate.push('1');
		});
	}
	return allPassValidate.length === 0;
};

// 取消
const cancelRow = async (row, index) => {
	try {
		await useMessageBox().confirm('该数据暂未保存，确认取消吗？');
		if (row.isTop) {
			tableData.value = [];
			getDatas(selectedId.value, 0);
		}
		if (row.add) {
			let parent = JSON.parse(JSON.stringify(parentRow.value));
			let index = parent.children.findIndex((v) => v.id == row.id);
			if (index > -1) {
				parent.children.splice(index, 1);
			}

			editTreeTable.value.store.states.lazyTreeNodeMap.value[row.parentId] = [];
			editTreeTable.value.store.states.lazyTreeNodeMap.value[row.parentId].push(...parent.children);
			editTreeTable.value.store.loadOrToggle(parent);

			isAddRow.value = [];
		} else {
			row.isEdit = false;
			row.taskName = cloneRow.value.taskName;
			row.planBeginDate = cloneRow.value.planBeginDate;
			row.planEndDate = cloneRow.value.planEndDate;
			isAddRow.value = [];
		}
	} catch (err) {}
};

// 保存行
const saveRow = (refs, row) => {
	tableValidate(refs);
	// 激活验证
	let isEmpty = [];
	for (var key in row) {
		if (!row[key] && !unTestVal.value.includes(key)) {
			isEmpty.push('1');
			return;
		}
	}

	if (isEmpty.length > 0) {
		return false;
	} else {
		save(row);
	}
};
const setInfo = (res) => {
	plan.value.state = res.data.state != null ? res.data.state : 0;
	plan.value.publishTime = res.data.publishTime != null ? res.data.publishTime : '';
	plan.value.taskCount = res.data.taskCount != null ? res.data.taskCount : 0;
	plan.value.versionIdVal = res.data.id != null ? res.data.id : '';
};
// 提交
const save = async (row) => {
	// const valid = await dataFormRef.value.validate().catch(() => {});
	// if (!valid) return false;
	try {
		loading.value = true;
		if (row.isTemp) {
			Reflect.deleteProperty(row, 'id');
		}
		!row.isTemp ? await putObj(row) : await add(row);
		useMessage().success(!row.isTemp ? '修改成功' : '添加成功');

		// 新增逻辑
		if (row.add) {
			nextTick(() => {
				let versionId: string = plan.value.versionIdVal;
				let params = {
					id: row.projectId,
					parentId: row.isTop ? 0 : row.parentId,
					versionId: versionId,
				};

				fetchList(params).then((res) => {
					setInfo(res);
					if (res.data.taskPlanInfoList != null) {
						res.data.taskPlanInfoList.map((v) => {
							v.add = false;
							v.isEdit = false;
							v.isTemp = false;
							if (v.parentId == '0') {
								v.isTop = true;
							}
						});
					}
					if (row.isTop) {
						tableData.value = res.data.taskPlanInfoList;
					} else {
						loading.value = true;
						// debugger;
						let parent = JSON.parse(JSON.stringify(parentRow.value));
						parent.children = res.data.taskPlanInfoList;
						// debugger;
						// parent.childCount = parent.children && parent.children.length;
						// editTreeTable.value.toggleRowExpansion(parent, true);
						// editTreeTable.value.store.states.treeData.value[row.parentId].loaded = false;
						// editTreeTable.value.store.states.treeData.value[row.parentId].expanded = true;
						editTreeTable.value.store.states.lazyTreeNodeMap.value[row.parentId] = [];
						editTreeTable.value.store.states.lazyTreeNodeMap.value[row.parentId].push(...parent.children);
						editTreeTable.value.store.loadOrToggle(parent);
						loading.value = false;
						isAddRow.value = [];
					}
				});

				// editTreeTable.value.store.states.treeData.value[row.id].loaded = false;
				// let { tree, treeNode, resolve } = rowMaps.get(row.id);

				// 源码bug，需要先置空
				// loadData(tree, treeNode, resolve);
				//更新后打开节点
				// editTreeTable.value.toggleRowExpansion(row, true);
				// editTreeTable.value.store.states.treeData.value[row.id].loaded = false;
				// 数据处理完成后 加载数据并展开父节点
				// debugger;
				// editTreeTable.value.store.loadOrToggle(row);
				//刷新树
				// refTable();
			});
		}
		row.isEdit = false;
		row.isTemp = false;
		row.add = false;
		isAddRow.value = [];
		// 新增逻辑
	} catch (err: any) {
		useMessage().error(err.msg);
	} finally {
		loading.value = false;
		row.isEdit = false;
		isAddRow.value = [];
	}
};
// const upRow = (scope, row, index) => {
// 	console.info(scope, row, index);
// 	//上移
// };
// const downRow = (row, index) => {
// 	//下移
// };
const proTableData = (data) => {
	let _this = this;
	//处理数据
	function dg(data) {
		for (let i in data) {
			data[i].isEdit = false;
			if (data[i].children) {
				//重要:树状节点数据刷新
				updateTableTree(data[i], data[i].children);
				dg(data[i].children);
			}
		}
	}
	dg(data);
};
// const initData = () => {
// 	//数据加载   模仿数据请求
// 	// let res = JSON.parse(JSON.stringify(sourceData.value));
// 	//数据处理 添加编辑标识
// 	// proTableData(res);
// 	// searchSource.value = JSON.parse(JSON.stringify(res));
// 	// tableData.value = res;
// };
// 提交排期计划
const submitPlan = async () => {
	if (plan.value.versionIdVal != '') {
		await useMessageBox().confirm('是否确认提交？提交后当前进度计划将立即生效');
		try {
			loading.value = true;
			await publish(plan.value.versionIdVal);
			useMessage().success('提交成功');
			loading.value = false;
			reloadPlanInfo(selectedId.value, 0);
		} catch (err: any) {
			// useMessage().error(err.msg);
		} finally {
			loading.value = false;
		}
	} else {
		useMessage().wraning('请添加任务后提交！');
	}
};

const editPlan = async () => {
	if (plan.value.versionIdVal != '') {
		await useMessageBox().confirm('是否确认重新编辑当前的任务排期？');
		try {
			versionEdit({ versionId: plan.value.versionIdVal, projectId: selectedId.value }).then((res) => {
				// useMessage().success('新版本已更新');
				loading.value = false;
				tableData.value = [];
				getDatas(selectedId.value, 0);
			});
		} catch (err: any) {
			// useMessage().error(err.msg);
		} finally {
			loading.value = false;
		}
	}
};

const loadData = (tree: any, treeNode: unknown, resolve: (data: any[]) => void) => {
	let versionId: string = plan.value.versionIdVal;
	let params = {
		id: tree.projectId,
		parentId: tree.id,
		versionId: versionId,
	};

	// let index = row.children.findIndex((v) => v.id == 'delete');
	// row.children.splice(index, 1);
	fetchList(params).then((res) => {
		if (res) {
			res.data.taskPlanInfoList.map((v) => {
				v.add = false;
				v.isEdit = false;
				v.isTemp = false;
				if (v.parentId == '0') {
					v.isTop = true;
				}
			});

			resolve(res.data.taskPlanInfoList);
			rowMaps.set(tree.id, { tree, treeNode, resolve });
			loading.value = false;
		}
	});
	isAddRow.value = [];
};
// const load = (tree, treeNode, resolve) => {
//   //节点加载

// 	setTimeout(() => {
// 		resolve(tree.children);

// };
const handleSelectionChange = (val) => {
	//全选
	editTreeTableVal.value = val;
};
</script>

<style scoped lang="scss">
tbody {
	position: relative;
}
.cd-tool {
	display: flex;
	flex-direction: row;
}
.data-table {
	:depp(.cell) {
		display: flex;
		align-items: center;
	}
}
// 树状表格样式
.a_tree_box {
	width: calc(100vw - 300px);
	height: 100%;
	margin-bottom: 20px;
	padding: 40px;
	.cd-tool {
		display: flex;
		flex-direction: row;
	}
	.data-table {
		:depp(.cell) {
			display: flex;
			align-items: center;
		}

		// 固定表格高度
		:depp(td) {
			height: 50px;
			padding: 0;
		}
		:depp(tbody) {
			tr {
				overflow: hidden;
				td {
					// width: 40px !important;
					// background-color: #1fff!important;
					// background-color: rgba(255, 255, 255, 0); //必须设置为透明色  否则 warning-row 显示不出来
					.cell {
						padding: 0 !important;
						// background-color: #1fff;

						height: 100%;
						position: relative;
						overflow: visible !important;
						.l_bor1_box {
							top: -24px;
							display: inline-block;
							width: 1px;
							height: 100%;
							border-left: 1px dashed #ccc;
							position: absolute;
						}
						.l_bor2_box {
							display: inline-block;
							width: 30px;
							height: 1px;
							border-top: 1px dashed #ccc;
							position: absolute;
						}
						.more_dash {
							display: inline-block;
							width: 1px;
							height: 50%;
							border-top: 1px dashed #ccc;
							position: absolute;
							top: calc(50% - 1px);
							// background-color: rgba(248, 250, 252, 1);
							background-color: rgb(255, 253, 253);
						}
						.el-table__expand-icon {
							//这个是将所有的条件前面的图标 固定掉
							display: inline-block;
							width: 20px !important;
							min-width: 20px !important;
							position: relative;
							z-index: 999;
							// background-color: #1fff;
						}
						.el-table__placeholder {
							//这个是将所有的条件前面的空白 固定成20px   这样才会有间隔层级视觉效果 如果不做固定 会导致 条件文字多的时候 有的是20xp 有的不是 就导致看起来没层级一样
							display: inline-block;
							width: 25px !important;
							max-width: 25px !important;
							min-width: 25px !important;
						}
						.l_bor3_box {
							display: inline-block;
							width: 1px;
							height: 15px;
							border-left: 1px dashed #ccc;
							top: 15px;
							left: -13px;
							position: relative;
						}
					}
				}
				td:nth-child(n + 2) {
					.cell {
						span {
							// background-color: #1fff;
							display: inline-block;
							width: 100%;
							text-align: center;
						}
					}
				}
			}
		}
	}
	.showName {
		display: inline-block;
		// max-width: 100px;
		// white-space: nowrap;
		white-space: wrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.one_two {
		width: 20px;
		height: 20px;
		margin-right: 3px;
	}
	.isML10 {
		margin-left: 10px; //判断有无数据 没数据就需要左偏移对齐
	}
	.abcd {
		width: 20px;
		height: 20px;
		cursor: pointer;
		margin-left: 3px;
	}
	.tip_icon {
		width: 20px;
		height: 20px;
		cursor: pointer;

		position: relative;
		top: -1px;
		left: 30px;
	}
	.tip_box {
		display: inline-block;
		width: fit-content !important;
		min-width: 105px;
		color: red;
		font-weight: 700;
		position: relative;
		top: 1px;
		margin-left: 33px;
		font-size: 17px;
	}

	:depp(.el-input__inner) {
		margin-left: 3px !important;
		padding: 0 !important;
		width: 44px !important;
		height: 25px !important;
		text-align: center !important;
	}

	.dia_box {
		:depp(.el-input) {
			text-align: left;
			.el-input__inner {
				width: 300px !important;
				height: 35px !important;
				text-align: left !important;
			}
		}
	}
}

.option-bar {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-top: 24px;
	margin-bottom: 17px;
	.add-btn {
		width: 108px;
		height: 30px;
		border-radius: 4px;
	}
	.right-bar {
		display: flex;
		justify-content: flex-start;
		align-items: center;
		.add-btn {
			width: 50px;
		}
		.total {
			font-size: 16px;
			font-weight: 600;
			color: #303133;
		}

		.process-state {
			display: flex;
			justify-content: flex-start;
			align-items: center;
			width: 200px;
			height: 30px;
			line-height: 30px;
			text-align: center;
			background: #ecf5ff;
			border-radius: 4px;
			border: 1px solid #d9ecff;
			margin-right: 12px;
			padding-left: 12px;
			.info-name {
				padding-left: 5px;
			}
			.state {
				font-size: 16px;
				font-weight: 500;
				color: #3668f7;
			}
		}

		.process-state-active {
			background-color: #e6ffe8 !important;
			.state {
				color: #04bf78 !important;
			}
		}
		.submit-time {
			font-size: 14px;
			font-family: PingFangSC, PingFang SC;
			font-weight: 400;
			color: #303133;
		}
		.split-item {
			margin-right: 24px;
			margin-left: 24px;
			color: #d1d3da;
		}
	}
}

.disClass {
	opacity: 0.5;
	pointer-events: none;
	cursor: not-allowed;
}
// 树状表格样式
.a_tree_box {
	width: calc(100vw - 300px);
	height: 100%;
	margin-bottom: 20px;
	padding: 40px;
	.cd-tool {
		display: flex;
		flex-direction: row;
	}
	.data-table {
		:deep(.cell) {
			display: flex;
			align-items: center;
		}

		// 固定表格高度
		:deep(td) {
			height: 50px;
			padding: 0;
		}
		:deep(tbody) {
			tr {
				overflow: hidden;
				td {
					// width: 40px !important;
					// background-color: #1fff!important;
					// background-color: rgba(255, 255, 255, 0); //必须设置为透明色  否则 warning-row 显示不出来
					.cell {
						padding: 0 !important;
						// background-color: #1fff;

						height: 100%;
						position: relative;
						overflow: visible !important;
						.l_bor1_box {
							top: -24px;
							display: inline-block;
							width: 1px;
							height: 100%;
							border-left: 1px dashed #ccc;
							position: absolute;
						}
						.l_bor2_box {
							display: inline-block;
							width: 30px;
							height: 1px;
							border-top: 1px dashed #ccc;
							position: absolute;
						}
						.more_dash {
							display: inline-block;
							width: 1px;
							height: 50%;
							border-top: 1px dashed #ccc;
							position: absolute;
							top: calc(50% - 1px);
							// background-color: rgba(248, 250, 252, 1);
							background-color: rgb(255, 253, 253);
						}
						.el-table__expand-icon {
							//这个是将所有的条件前面的图标 固定掉
							display: inline-block;
							width: 20px !important;
							min-width: 20px !important;
							position: relative;
							z-index: 999;
							// background-color: #1fff;
						}
						.el-table__placeholder {
							//这个是将所有的条件前面的空白 固定成20px   这样才会有间隔层级视觉效果 如果不做固定 会导致 条件文字多的时候 有的是20xp 有的不是 就导致看起来没层级一样
							display: inline-block;
							width: 25px !important;
							max-width: 25px !important;
							min-width: 25px !important;
						}
						.l_bor3_box {
							display: inline-block;
							width: 1px;
							height: 15px;
							border-left: 1px dashed #ccc;
							top: 15px;
							left: -13px;
							position: relative;
						}
					}
				}
				td:nth-child(n + 2) {
					.cell {
						span {
							// background-color: #1fff;
							display: inline-block;
							width: 100%;
							text-align: center;
						}
					}
				}
			}
		}
	}
	.showName {
		display: inline-block;
		// max-width: 100px;
		// white-space: nowrap;
		white-space: wrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.one_two {
		width: 20px;
		height: 20px;
		margin-right: 3px;
	}
	.isML10 {
		margin-left: 10px; //判断有无数据 没数据就需要左偏移对齐
	}
	.abcd {
		width: 20px;
		height: 20px;
		cursor: pointer;
		margin-left: 3px;
	}
	.tip_icon {
		width: 20px;
		height: 20px;
		cursor: pointer;

		position: relative;
		top: -1px;
		left: 30px;
	}
	.tip_box {
		display: inline-block;
		width: fit-content !important;
		min-width: 105px;
		color: red;
		font-weight: 700;
		position: relative;
		top: 1px;
		margin-left: 33px;
		font-size: 17px;
	}

	:deep(.el-input__inner) {
		margin-left: 3px !important;
		padding: 0 !important;
		width: 44px !important;
		height: 25px !important;
		text-align: center !important;
	}

	.dia_box {
		:deep(.el-input) {
			text-align: left;
			.el-input__inner {
				width: 300px !important;
				height: 35px !important;
				text-align: left !important;
			}
		}
	}
}
.option-btn {
	margin-right: 20px;
}
.option-btn:last-child {
	margin-right: 0px;
}
.box-item {
	width: 110px;
	margin-top: 0;
}

.el-form-item {
	margin-bottom: 0 !important;
}
body {
	height: 100% !important;
}
// .table-content {
// 	position: relative;
// 	display: flex;
// 	height: 100%;
// 	width: 100%;
// 	overflow: auto;
// }

// :deep(.is-vertical .el-scrollbar__thumb) {
// 	display: none;
// }

// :deep(.el-scrollbar__bar.is-horizontal > div) {
// 	position: fixed;
// 	bottom: 8px;
// 	height: 6px;
// }
</style>
