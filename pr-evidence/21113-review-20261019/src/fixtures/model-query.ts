import type { IAddedModel } from '@/interfaces/database/llm';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

// Model-list hook fixture. Key shape, initialData, gcTime, return state and
// response-envelope interpretation match the real useFetchAllAddedModels.
// Only transport/auth/notification surroundings are replaced by local HTTP.
export const LlmKeys = {
  allModels: (modelType?: string) => ['allModels', modelType] as const,
  ownedModels: (modelType?: string, ownerTenantId?: string) =>
    [...LlmKeys.allModels(modelType), ownerTenantId] as const,
};

export const useFetchAllAddedModels = (
  modelType?: string,
  ownerTenantId?: string,
) => {
  const { data, isFetching: loading, isFetched, isError } = useQuery<IAddedModel[]>({
    queryKey: LlmKeys.ownedModels(modelType, ownerTenantId),
    initialData: [],
    gcTime: 0,
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (modelType) params.type = modelType;
      if (ownerTenantId) params.tenant_id = ownerTenantId;
      const { data } = await axios.get('/api/v1/models', { params });
      return data?.data ?? [];
    },
  });
  return { data, loading, isFetched, isError };
};
