# Fuelogic Enterprise Control


## Configuração do Ambiente

Este projeto requer algumas variáveis de ambiente para funcionar corretamente. Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:

```
VITE_TANKS_ENDPOINT=https://api.example.com/tanks
VITE_API_KEY=sua_chave_api_aqui
```

### Variáveis de Ambiente

- `VITE_TANKS_ENDPOINT`: URL do endpoint da API que fornece os dados dos tanques
- `VITE_API_KEY`: Chave de API necessária para autenticação nas requisições (enviada como parâmetro de consulta)

## Recursos

- **Temas Claro/Escuro**: Interface adaptável com temas personalizados
- **Indicadores de Tanques**: Visualização realista dos níveis de combustível preenchendo de baixo para cima
- **Integração com API**: Busca dados de tanques em tempo real

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS