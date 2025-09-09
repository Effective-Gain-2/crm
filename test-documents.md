# Sistema de Documentos - API

## Endpoints

### 1. Upload de Documento
**POST** `/documents/upload`

**Body (multipart/form-data):**
- `file`: Arquivo PDF (obrigatório)
- `title`: Título do documento (obrigatório)
- `description`: Descrição do documento (opcional)
- `category`: Categoria do documento (opcional)

**Exemplo de uso:**
```bash
curl -X POST http://localhost:3002/documents/upload \
  -F "file=@documento.pdf" \
  -F "title=Contrato Cliente" \
  -F "description=Contrato de prestação de serviços" \
  -F "category=contratos"
```

### 2. Listar Documentos
**GET** `/documents`

**Query Parameters:**
- `category`: Filtrar por categoria (opcional)
- `limit`: Limite de resultados (padrão: 50)
- `offset`: Offset para paginação (padrão: 0)

**Exemplo:**
```bash
curl "http://localhost:3002/documents?category=contratos&limit=10&offset=0"
```

### 3. Deletar Documento
**DELETE** `/documents/:id`

**Exemplo:**
```bash
curl -X DELETE http://localhost:3002/documents/1
```

## Configurações

- **Tamanho máximo**: 10MB
- **Formatos aceitos**: Apenas PDF
- **Pasta de upload**: `uploads/documents/`
- **Banco de dados**: Tabela `documents`

## Estrutura da Tabela

```sql
CREATE TABLE documents (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  file_name VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## Próximos Passos

- [ ] Suporte para outros tipos de documento (DOC, DOCX, XLS, XLSX)
- [ ] Sistema de tags para documentos
- [ ] Busca por texto dentro dos documentos
- [ ] Versionamento de documentos
- [ ] Compartilhamento de documentos
- [ ] Permissões de acesso
