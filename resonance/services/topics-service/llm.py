from pathlib import Path

from llama_cpp import Llama

MODEL_PATH = Path(__file__).parent / "models" / "qwen2.5-3b-instruct-q4_k_m.gguf"

# Shared across labeling.py and sentiment.py so the 3B model only loads once.
llm = Llama(model_path=str(MODEL_PATH), n_ctx=4096, verbose=False)
