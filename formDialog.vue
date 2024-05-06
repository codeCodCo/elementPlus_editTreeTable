<template>
	<el-dialog title="添加关联楼栋任务" v-model="visible" :close-on-click-modal="false" draggable>
		<div class="option-btn">
			<el-button type="primary" icon="setting" @click="goSetting">前往配置</el-button>
			<el-button icon="Refresh" @click="refresh">刷新</el-button>
		</div>
		<el-table :data="dataList" v-loading="loading" border @selection-change="selectionChangHandle">
			<el-table-column type="selection" width="40" align="center" />
			<el-table-column type="index" label="序号" width="60" align="center" />
			<el-table-column prop="areaName" label="地块" show-overflow-tooltip align="center" />
			<el-table-column prop="towerNum" label="楼栋名" show-overflow-tooltip align="center" />
			<el-table-column prop="epipelagicNum" label="地上层数" show-overflow-tooltip align="center" />
			<el-table-column prop="buildFunction" label="建筑功能" show-overflow-tooltip align="center" />
		</el-table>

		<template #footer>
			<span class="dialog-footer">
				<el-button @click="visible = false">取消</el-button>
				<el-button type="primary" @click="onSubmit" :disabled="loading">确认</el-button>
			</span>
		</template>
	</el-dialog>
</template>

<script setup lang="ts" name="DpmProjectDialog">
import { useMessage } from '/@/hooks/message';
import { getAssociationDpmBuild, saveBuild } from '/@/api/task/taskPlan';
import { UseTransaRoute } from '/@/stores/transaction';

const store = UseTransaRoute();
const emit = defineEmits(['refresh']);
const router = useRouter();
// 定义变量内容
const dataFormRef = ref();
const visible = ref(false);
const loading = ref(false);
const dataList = ref([]);
const selectObjs = ref([]);
const multiple = ref(false);
const isChecked = ref(0);
const projectId = ref('');
const RowId = ref('');
const rows = ref({});
const props = defineProps({
	reload: {
		type: Function,
	},
	reloadTree: {
		type: Function,
	},
});

const goSetting = () => {
	// 跳转到维护楼栋信息
	store.projectIdByBaseToBuild = projectId.value;
	router.push({ path: '/project/building/index' });
	visible.value = false;
};

const refresh = () => {
	initData(projectId.value);
};

const initData = (id) => {
	loading.value = true;
	getAssociationDpmBuild(id).then((res) => {
		dataList.value = res.data;
		loading.value = false;
	});
};
// 打开弹窗
const openDialog = (row) => {
	visible.value = true;
	// form.id = '';
	rows.value = row;
	projectId.value = row.projectId;
	RowId.value = row.id;
	// 重置表单数据
	nextTick(() => {
		dataFormRef.value?.resetFields();
	});
	initData(row.projectId);
};

// 提交
const onSubmit = async () => {
	if (selectObjs.value.length > 0) {
		try {
			loading.value = true;
			let submitObj = {
				parentId: RowId.value,
				associationDpmBuildVoList: [],
			};
			submitObj.associationDpmBuildVoList = JSON.parse(JSON.stringify(selectObjs.value));
			await saveBuild(submitObj);
			useMessage().success('添加成功');
			emit('refresh');
			visible.value = false;
			props.reload(projectId.value, RowId.value);
			props.reloadTree(rows.value);
		} catch (err: any) {
			// console.log(err);
			// useMessage().error(err.msg);
		} finally {
			loading.value = false;
		}
	} else {
		useMessage().wraning('暂未选择任何关联信息，请选择信息后点击确定');
	}
};

// 多选事件
const selectionChangHandle = (objs: { projectId; areaName; areaNumber; towerNum; epipelagicNum; buildFunction; structuralStyle }[]) => {
	selectObjs.value = objs.map((v) => {
		return {
			projectId: v.projectId,
			areaName: v.areaName,
			areaNumber: v.areaNumber,
			towerNum: v.towerNum,
			epipelagicNum: v.epipelagicNum,
			buildFunction: v.buildFunction,
			structuralStyle: v.structuralStyle,
		};
	});
	multiple.value = !objs.length;
	isChecked.value = objs.length;
};

// 暴露变量
defineExpose({
	openDialog,
});
</script>

<style scoped lang="scss">
.option-btn {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 20px;
}
</style>
