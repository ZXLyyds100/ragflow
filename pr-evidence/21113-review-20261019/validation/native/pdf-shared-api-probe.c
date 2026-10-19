#include <stdio.h>
#include "pdf_oxide.h"

int main(int argc, char **argv) {
  if (argc != 2) return 1;
  int32_t error = 0;
  PdfDocument *document = pdf_document_open(argv[1], &error);
  if (!document || error != 0) {
    fprintf(stderr, "Real pdf_document_open failed: handle=%p error=%d\n",
            (void *)document, error);
    return 2;
  }
  const int32_t pages = pdf_document_get_page_count(document, &error);
  uint8_t major = 0, minor = 0;
  pdf_document_get_version(document, &major, &minor);
  pdf_document_free(document);
  if (error != 0 || pages != 1 || major != 1 || minor != 4) {
    fprintf(stderr, "Real FFI result: error=%d pages=%d document_version=%u.%u\n",
            error, pages, major, minor);
    return 3;
  }
  puts("Hash-pinned genuine PDF_oxide 0.3.73 shared FFI: open, page-count, document-version and free OK.");
  puts("PDF document version is 1.4; library version is separately pinned by the author's exact v0.3.73 release asset SHA256, not by the PDF document-version getter. No library version getter/marker is available.");
  return 0;
}
