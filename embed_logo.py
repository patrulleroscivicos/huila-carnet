import base64

# Leer la imagen y convertir a base64
with open('fondologo.png', 'rb') as f:
    b64 = 'data:image/png;base64,' + base64.b64encode(f.read()).decode('ascii')

# Leer HTML
with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Reemplazar todas las ocurrencias de fondologo.png
old = 'fondologo.png'
count = html.count(old)
print(f'Ocurrencias encontradas: {count}')

html_new = html.replace(old, b64)

# Guardar
with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html_new)

print('OK - Logo incrustado correctamente en todas las ocurrencias')
