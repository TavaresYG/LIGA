/// <reference types="vite/client" />
/**
 * Configuração central da API para o LIGA-Web.
 * O endereço padrão é localhost:5000 para desenvolvimento.
 * Para produção, utilize a variável de ambiente VITE_API_URL.
 */

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
export default API_URL;
