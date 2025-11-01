// src/api/supplierEvaluations.js
import api from './axios';

const RESOURCE = '/api/supplier-evaluations';

export const listSupplierEvaluations = async (params = {}, options = {}) => {
  const { data } = await api.get(RESOURCE, { params, ...options });
  return Array.isArray(data) ? data : [];
};

export const getSupplierEvaluation = async (id, options = {}) => {
  const { data } = await api.get(`${RESOURCE}/${id}`, options);
  return data;
};

export const createSupplierEvaluation = async (payload, options = {}) => {
  const { data } = await api.post(RESOURCE, payload, options);
  return data;
};

export const updateSupplierEvaluation = async (id, payload, options = {}) => {
  const { data } = await api.put(`${RESOURCE}/${id}`, payload, options);
  return data;
};

export const deleteSupplierEvaluation = async (id, options = {}) => {
  await api.delete(`${RESOURCE}/${id}`, options);
};

export default {
  listSupplierEvaluations,
  getSupplierEvaluation,
  createSupplierEvaluation,
  updateSupplierEvaluation,
  deleteSupplierEvaluation,
};