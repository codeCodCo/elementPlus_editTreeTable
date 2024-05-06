<template>
	<el-dialog title="关联业务" v-model="visible" :close-on-click-modal="false" draggable :width="500">
		<div class="subTitle">当前任务：{{ rows.taskName }}</div>
		<el-form class="grid-form" ref="dataFormRef" :model="form" :rules="dataRules" v-loading="loading">
			<el-form-item label="业务" prop="businessType">
				<el-select v-model="form.businessType" @change="changeBusinessType">
					<el-option v-for="item in businessTypeDict" :key="item.id" :label="item.label" :value="item.value">{{ item.label }}</el-option>
				</el-select>
			</el-form-item>
			<el-form-item label="类型" prop="id1">
				<el-select v-model="form.id1" @change="changeContractType">
					<el-option v-for="item in contractTypeDict" :key="item.id" :label="item.label" :value="item.id"> </el-option>
				</el-select>
			</el-form-item>
			<el-form-item label="细项" prop="id2">
				<el-select v-model="form.id2">
					<el-option
						v-for="item in contractDetailOptions"
						:key="item.contractSpecificPointId"
						:label="item.specificPointName"
						:value="item.contractSpecificPointId"
					></el-option>
				</el-select>
			</el-form-item>
		</el-form>

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
import { getAssociationDpmBuild, saveBuild, getContractDetail, saveRelateWork, getRelateWorkByTaskId } from '/@/api/task/taskPlan';
import { UseTransaRoute } from '/@/stores/transaction';
import DictionarySelect from '/@/components/DictSelector/index.vue';
import { getDicts } from '/@/api/admin/dict';
import file from '/@/components/Material/file.vue';

const store = UseTransaRoute();
const emit = defineEmits(['refresh', 'loadingStart']);
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
const rows = ref<any>({});
const businessTypeDict = ref([]);
const props = defineProps({
	reloadPlanInfo: {
		type: Function,
	},
	reloadNode: {
		type: Function,
	},
});

const form = reactive({
	id1: '',
	id2: '',
	businessType: '',
});

const dataRules = ref({
	id1: [{ required: true, message: '类型不能为空', trigger: 'blur' }],
	id2: [{ required: true, message: '细项不能为空', trigger: 'blur' }],
	businessType: [{ required: true, message: '业务不能为空', trigger: 'blur' }],
});

const contractDetailOptions = ref([]);
const contractTypeDict = ref([]);
const relateWorkId = ref('');

const changeContractType = (e) => {
	form.id2 = '';
	getContractDetail({ contractTypeId: e }).then((res) => {
		contractDetailOptions.value = res.data;
	});
};
const changeBusinessType = (w) => {
	form.businessType = w;
};
// 打开弹窗
const openDialog = (row) => {
	visible.value = true;

	// 重置表单数据
	nextTick(() => {
		dataFormRef.value?.resetFields();
		relateWorkId.value = '';
		loading.value = true;
		getDicts('contract_type').then((res) => {
			contractTypeDict.value = res.data.filter((e) => e.label !== '补充合同');
		});

		getDicts('business').then((res) => {
			businessTypeDict.value = res.data.map((v) => {
				return { label: v.label, value: v.value };
			});
		});
		contractDetailOptions.value = [];
		// form.id = '';
		rows.value = row;
		projectId.value = row.projectId;
		RowId.value = row.id;
		// console.log(row.id);
		getRelateWorkByTaskId(row.id).then((res) => {
			if (res.data?.contractTypeId) {
				form.id1 = res.data?.contractTypeId;
				getContractDetail({ contractTypeId: res.data?.contractTypeId }).then((res1) => {
					contractDetailOptions.value = res1.data;
					form.id2 = res.data?.contractSpecificPointId;
					form.businessType = String(res.data?.businessType);
					relateWorkId.value = res.data.id;
					loading.value = false;
				});
			} else {
				loading.value = false;
			}
		});
	});
};

// 提交
const onSubmit = async () => {
	if (!dataFormRef) return;
	const valid = await dataFormRef.value.validate().catch(() => {});
	if (!valid) return false;
	try {
		loading.value = true;
		let params = {
			taskId: RowId.value,
			contractTypeId: form.id1,
			contractSpecificPointId: form.id2,
			businessType: form.businessType,
			id: relateWorkId.value || undefined,
		};
		const res = await saveRelateWork(params);
		if (res.ok === true) {
			useMessage().success(relateWorkId.value ? '修改成功' : '添加成功');
			loading.value = false;
			visible.value = false;
			emit('loadingStart', true);
			await props.reloadPlanInfo(rows.value.projectId, rows.value.parentId);
			await props.reloadNode(rows.value);
		}
	} catch (err: any) {
		useMessage().error(err?.msg);
	} finally {
		loading.value = false;
		emit('loadingStart', false);
	}
	return;
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
.subTitle {
	margin-bottom: 20px;
}

.grid-form {
	display: grid;
	// grid-template-columns: 1fr 1fr;
	// grid-column-gap: 20px;
	.el-form-item--default {
		// margin-bottom: 10px;
	}
	// border: 1px solid #ebeef5;
	// padding: 19px 24px;
	.el-form-item:last-of-type {
		margin-bottom: 18px !important;
	}
	.el-form-item {
		&.column-2 {
			grid-column: 2 / 2;
			grid-row: 4 / 7;
		}
	}
}
</style>
