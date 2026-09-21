import os
from pathlib import Path

from llama_cpp import Llama

MODEL_PATH = Path(__file__).parent / "models" / "qwen2.5-3b-instruct-q4_k_m.gguf"

N_GPU_LAYERS = int(os.environ.get("LLM_GPU_LAYERS", "-1"))

llm = Llama(model_path=str(MODEL_PATH), n_ctx=8192, n_gpu_layers=N_GPU_LAYERS, verbose=False)

llm.create_chat_completion(messages=[{"role": "user", "content": "hi"}], max_tokens=1)

if N_GPU_LAYERS != 0:
    llm.create_chat_completion(messages=[{"role": "user", "content": "warm up " * 2200}], max_tokens=1)
