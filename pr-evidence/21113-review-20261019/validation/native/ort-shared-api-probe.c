#include <dlfcn.h>
#include <stddef.h>
#include <stdio.h>
#include <string.h>
#include "onnxruntime_c_api.h"

int main(void) {
  void *handle = dlopen(NULL, RTLD_NOW);
  if (!handle) {
    fprintf(stderr, "dlopen(NULL): %s\n", dlerror());
    return 1;
  }
  const OrtApiBase *(*get_base)(void) =
      (const OrtApiBase *(*)(void))dlsym(handle, "OrtGetApiBase");
  if (!get_base) {
    fprintf(stderr, "dlsym(OrtGetApiBase): %s\n", dlerror());
    return 2;
  }
  const OrtApiBase *base = get_base();
  const char *version = base->GetVersionString();
  if (strcmp(version, "1.29.0") != 0) {
    fprintf(stderr, "Unexpected ORT version: %s\n", version);
    return 3;
  }
  const OrtApi *api = base->GetApi(ORT_API_VERSION);
  if (!api) {
    fprintf(stderr, "ORT API %d unavailable\n", ORT_API_VERSION);
    return 4;
  }
  OrtEnv *environment = NULL;
  OrtStatus *status = api->CreateEnv(ORT_LOGGING_LEVEL_ERROR,
                                    "ragflow-test-only-probe", &environment);
  if (status) {
    fprintf(stderr, "CreateEnv: %s\n", api->GetErrorMessage(status));
    api->ReleaseStatus(status);
    return 5;
  }
  api->ReleaseEnv(environment);
  printf("Real ORT %s; GetApi(%d), dlopen(NULL)/dlsym, CreateEnv/ReleaseEnv OK.\n",
         version, ORT_API_VERSION);
  printf("Standard OrtApi prefix tested only; the three appended custom "
         "initializer slots are not supported or called (offset %zu).\n",
         offsetof(OrtApi, SessionGetInitializerCount));
  dlclose(handle);
  return 0;
}
