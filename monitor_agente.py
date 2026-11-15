import sys, time, threading, requests
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

# URL do Habblaud que já está rodando na sua máquina
HABBLAUD_URL = "http://localhost:4747/api/events"
AGENT_NAME = "antigravity-bot"
ROOM_NAME = "meu-projeto"

def atualizar_habblaud(status, task):
    try:
        requests.post(HABBLAUD_URL, json={
            "room": ROOM_NAME,
            "agent_id": AGENT_NAME,
            "status": status,
            "current_task": task
        }, timeout=1)
    except Exception:
        pass # Ignora erros silenciosamente

class MonitorAntigravity(FileSystemEventHandler):
    def __init__(self):
        self.timer = None
        atualizar_habblaud("idle", "Esperando o Antigravity...")

    def ficar_ocioso(self):
        atualizar_habblaud("idle", "Aguardando tarefas...")

    def on_modified(self, event):
        # Ignora pastas (como .git ou node_modules)
        if event.is_directory or '.git' in event.src_path or 'node_modules' in event.src_path: 
            return
        
        atualizar_habblaud("working", "Escrevendo código...")
        
        # Reseta o tempo: se ficar 3 segundos sem salvar nada, volta a sentar
        if self.timer:
            self.timer.cancel()
        self.timer = threading.Timer(3.0, self.ficar_ocioso)
        self.timer.start()

if __name__ == "__main__":
    pasta_alvo = sys.argv[1] if len(sys.argv) > 1 else "."
    observer = Observer()
    observer.schedule(MonitorAntigravity(), pasta_alvo, recursive=True)
    observer.start()
    print(f"Monitorando arquivos na pasta: {pasta_alvo}")
    
    try:
        while True: time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()
    observer.join()


