ADOC_FILES := $(wildcard *.adoc)
PDF_FILES  := $(ADOC_FILES:.adoc=.pdf)

ASCIIDOCTOR_PDF := asciidoctor-pdf
THEME_FLAGS     := -a pdf-theme=serif-theme.yml

.PHONY: all clean check-deps

check-deps:
	@command -v asciidoctor     >/dev/null 2>&1 || { echo "Error: asciidoctor is not installed"; exit 1; }
	@command -v asciidoctor-pdf >/dev/null 2>&1 || { echo "Error: asciidoctor-pdf is not installed"; exit 1; }

all: check-deps $(PDF_FILES)

all: $(PDF_FILES)

%.pdf: %.adoc
	$(ASCIIDOCTOR_PDF) $(THEME_FLAGS) $< -o $@

clean:
	rm -f $(PDF_FILES)
