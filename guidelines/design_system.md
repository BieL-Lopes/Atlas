# Padrões de Design Front-end (Politiqui / Atlas)

Este documento define os padrões visuais e de componentes para o aplicativo Atlas. Siga rigorosamente este guia para criar novas telas e componentes.

## 1. Cores Principais

- **Primária (Ações e Destaques):** `blue-600` (`bg-blue-600`, `text-blue-600`)
- **Hover Primário:** `blue-700`
- **Fundo Principal:** `gray-50` ou `gray-100` (`bg-gray-50`)
- **Cards e Containers:** `bg-white` com `shadow`
- **Textos:** `text-gray-900` para títulos, `text-gray-600` ou `text-gray-500` para descrições.

## 2. Tipografia

- Fontes padrão do Tailwind (sans).
- **Títulos de tela:** `text-2xl font-bold text-gray-900`
- **Títulos de cards:** `text-lg font-bold text-gray-900`

## 3. Botões e Ações (Padrões Rigorosos)

Nunca utilize blocos grandes com gradientes (ex: `bg-gradient-to-r from-purple...`) para ações simples, pois quebram o padrão clean e profissional da interface.

### 3.1 Botão Principal (Primary Button)
Usado para ações principais (ex: Salvar, Adicionar).
```tsx
className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors"
```

### 3.2 Botão Secundário / Outline (Secondary Button)
Usado para ações secundárias e navegações alternativas.
```tsx
className="w-full py-3 px-4 bg-white border-2 border-blue-200 text-blue-700 hover:bg-blue-50 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors"
```

### 3.3 Botões de Ícone (Icon Only)
Usado para botões lado a lado (ex: Exportar, Lixeira).
```tsx
className="py-3 px-4 bg-white border-2 border-gray-200 hover:border-gray-300 text-gray-700 rounded-xl font-semibold flex items-center justify-center transition-colors"
```

## 4. Cards e Containers

Todo conteúdo principal deve estar dentro de um container arredondado com sombra sutil:
```tsx
className="bg-white rounded-2xl shadow overflow-hidden border border-gray-100" // ou p-4/p-5
```

## 5. Ícones
Utilizar sempre a biblioteca `lucide-react` com tamanho padrão `w-5 h-5` para botões e menus, e `w-4 h-4` para detalhes e badges.
