ADOC_FILES := $(wildcard *.adoc)
PDF_FILES  := $(ADOC_FILES:.adoc=.pdf)

ASCIIDOCTOR_PDF := asciidoctor-pdf
THEME_FLAGS     := -a pdf-themesdir=. -a pdf-theme=serif

.PHONY: all clean

all: $(PDF_FILES)

%.pdf: %.adoc
	$(ASCIIDOCTOR_PDF) $(THEME_FLAGS) $< -o $@

clean:
	rm -f $(PDF_FILES)
