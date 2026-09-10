from pathlib import Path

from llama_cpp import Llama

MODEL_PATH = Path(__file__).parent / "models" / "qwen2.5-3b-instruct-q4_k_m.gguf"

llm = Llama(model_path=str(MODEL_PATH), n_ctx=8192, n_gpu_layers=-1, verbose=False)

llm.create_chat_completion(messages=[{"role": "user", "content": "hi"}], max_tokens=1)
llm.create_chat_completion(messages=[{"role": "user", "content": "warm up " * 2200}], max_tokens=1)
