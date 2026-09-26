.PHONY: test smoke smoke-synthid bootstrap-synthid docker-synthid-build docker-synthid-help \
	smoke-ctrlregen bootstrap-ctrlregen docker-ctrlregen-build docker-ctrlregen-help \
	smoke-markllm bootstrap-markllm docker-markllm-build docker-markllm-help \
	smoke-markdiffusion bootstrap-markdiffusion docker-markdiffusion-build docker-markdiffusion-help \
	docker-core-build docker-core-help serve compose-up compose-up-heavy compose-check \
	install-skill install-cursor-text-skill install-claude-skill sync-skill clean

SCRIPTS := service/scripts
SKILL_DIR := skills/remove-claude-marks

# Modules the agent skill bundles so it runs with no service and no venv. This
# is the import closure of the entry points, minus the server and the heavy
# optional backends. tests/test_skill_bundle.py fails if the copies drift.
SKILL_MODULES := common text_unicode format_dispatch image_meta container_meta \
	inspect_text clean_text inspect_file clean_file inspect_image clean_image \
	rewrite_text score_stylometry
PYTHON ?= $(shell if [ -x .venv/bin/python ]; then echo .venv/bin/python; else echo python3; fi)

test:
	$(PYTHON) -m pytest

smoke:
	-python3 $(SCRIPTS)/inspect_text.py tests/fixtures/sample_watermarked.txt
	python3 $(SCRIPTS)/clean_text.py tests/fixtures/sample_watermarked.txt -o /tmp/wm.cleaned.txt --stats
	python3 $(SCRIPTS)/rewrite_text.py tests/fixtures/sample_watermarked.txt --backend print-prompt >/dev/null
	-python3 $(SCRIPTS)/inspect_file.py tests/fixtures/sample_ai.md
	python3 $(SCRIPTS)/clean_file.py tests/fixtures/sample_ai.md -o /tmp/sample_ai.cleaned.md
	python3 $(SCRIPTS)/clean_file.py tests/fixtures/sample_ai.html -o /tmp/sample_ai.cleaned.html
	python3 $(SCRIPTS)/clean_file.py tests/fixtures/sample_meta.svg -o /tmp/sample_meta.cleaned.svg
	@echo "smoke ok"

smoke-synthid:
	@if [ -z "$(REVERSE_SYNTHID_DIR)" ]; then \
	  echo "smoke-synthid skipped (set REVERSE_SYNTHID_DIR)"; \
	else \
	  $(PYTHON) $(SCRIPTS)/score_synthid.py --help >/dev/null && echo "score_synthid adapter present"; \
	fi

bootstrap-synthid:
	./service/scripts/setup_synthid.sh

docker-synthid-build:
	docker build -f service/Dockerfile.synthid -t claude-watermark-remover-synthid-scorer service/

docker-synthid-help:
	docker run --rm claude-watermark-remover-synthid-scorer --help

smoke-ctrlregen:
	@if [ -z "$(NOAI_WATERMARK_DIR)" ]; then \
	  echo "smoke-ctrlregen skipped (set NOAI_WATERMARK_DIR)"; \
	else \
	  $(PYTHON) $(SCRIPTS)/clean_ctrlregen.py --help >/dev/null && echo "clean_ctrlregen adapter present"; \
	fi

bootstrap-ctrlregen:
	./service/scripts/setup_ctrlregen.sh

docker-ctrlregen-build:
	docker build -f service/Dockerfile.ctrlregen -t claude-watermark-remover-ctrlregen service/

docker-ctrlregen-help:
	docker run --rm claude-watermark-remover-ctrlregen --help

smoke-markllm:
	@if [ -z "$(MARKLLM_DIR)" ]; then \
	  echo "smoke-markllm skipped (set MARKLLM_DIR)"; \
	else \
	  $(PYTHON) $(SCRIPTS)/detect_text_watermark.py --help >/dev/null && echo "detect_text_watermark adapter present"; \
	fi

bootstrap-markllm:
	./service/scripts/setup_markllm.sh

docker-markllm-build:
	docker build -f service/Dockerfile.markllm -t claude-watermark-remover-markllm service/

docker-markllm-help:
	docker run --rm claude-watermark-remover-markllm --help

smoke-markdiffusion:
	@if [ -z "$(MARKDIFFUSION_DIR)" ]; then \
	  echo "smoke-markdiffusion skipped (set MARKDIFFUSION_DIR)"; \
	else \
	  $(PYTHON) $(SCRIPTS)/markdiffusion_harness.py --help >/dev/null && echo "markdiffusion_harness adapter present"; \
	fi

bootstrap-markdiffusion:
	./service/scripts/setup_markdiffusion.sh

docker-markdiffusion-build:
	docker build -f service/Dockerfile.markdiffusion -t claude-watermark-remover-markdiffusion service/

docker-markdiffusion-help:
	docker run --rm claude-watermark-remover-markdiffusion --help

# Core HTTP service (text + file/image metadata cleaning).
docker-core-build:
	docker build -f service/Dockerfile -t claude-watermark-remover service/

docker-core-help:
	docker run --rm claude-watermark-remover /app/scripts/server.py --help

# Run the HTTP service locally (stdlib only, no Docker).
serve:
	$(PYTHON) $(SCRIPTS)/server.py --host 127.0.0.1 --port 8765

compose-up:
	docker compose up --build -d

compose-up-heavy:
	docker compose --profile harness --profile heavy up --build -d

compose-check:
	./compose-check.sh

# Refresh the skill's bundled script copies from service/scripts (the canonical
# source). Run after changing anything under service/scripts/.
sync-skill:
	@mkdir -p $(SKILL_DIR)/scripts
	@for m in $(SKILL_MODULES); do cp $(SCRIPTS)/$$m.py $(SKILL_DIR)/scripts/; done
	@echo "synced $(words $(SKILL_MODULES)) modules -> $(SKILL_DIR)/scripts/"

# Claude Code: symlink so repo edits are picked up immediately.
install-claude-skill: sync-skill
	mkdir -p $(HOME)/.claude/skills
	ln -sfn $(CURDIR)/$(SKILL_DIR) $(HOME)/.claude/skills/remove-claude-marks
	@echo "linked -> $(HOME)/.claude/skills/remove-claude-marks"
	@echo "restart Claude Code, then run /remove-claude-marks"

install-skill:
	mkdir -p $(HOME)/.grok/skills
	ln -sfn $(CURDIR)/skills/remove-claude-marks $(HOME)/.grok/skills/remove-claude-marks
	@echo "linked -> $(HOME)/.grok/skills/remove-claude-marks"

install-cursor-text-skill:
	$(PYTHON) install_skill.py

clean:
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	rm -rf .pytest_cache .venv
