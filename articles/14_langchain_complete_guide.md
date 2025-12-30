# LangChain 0.1.0+ 完全指南：从入门到精通

## 摘要

LangChain 0.1.0 版本带来了重大的架构改进和 API 优化。本文详细讲解 LangChain 最新版本的核心特性、模块化设计、Runnable 接口、链式调用、记忆管理等，并提供完整的实战代码示例。

---

## 一、LangChain 0.1.0 的重大变化

### 1.1 版本对比

| 特性 | 0.0.x | 0.1.0+ |
|------|-------|--------|
| 架构 | 单体 | 模块化 |
| 包结构 | langchain | langchain_core, langchain_community, langchain_openai |
| 类型提示 | 部分 | 完整 |
| Runnable | 基础 | 完整实现 |
| 异步支持 | 有限 | 完整 |
| 文档 | 基础 | 详细 |

### 1.2 新的模块结构

```
langchain/
├── langchain_core/           # 核心接口和基类
│   ├── language_models/      # LLM 基类
│   ├── embeddings/           # 嵌入模型
│   ├── vectorstores/         # 向量存储
│   ├── retrievers/           # 检索器
│   ├── prompts/              # 提示模板
│   ├── output_parsers/       # 输出解析
│   └── runnables/            # 可运行接口
│
├── langchain_community/      # 社区集成
│   ├── llms/                 # 第三方 LLM
│   ├── embeddings/           # 第三方嵌入
│   ├── document_loaders/     # 文档加载器
│   └── vectorstores/         # 第三方向量存储
│
└── langchain_openai/         # OpenAI 集成
    ├── chat_models/          # ChatGPT
    └── embeddings/           # OpenAI 嵌入
```

---

## 二、核心概念详解

### 2.1 Runnable 接口

**什么是 Runnable？**

Runnable 是 LangChain 0.1.0 的核心抽象，代表任何可以被调用的对象。

```python
from langchain_core.runnables import Runnable

class MyRunnable(Runnable):
    """自定义可运行对象"""
    
    def invoke(self, input, config=None):
        """同步调用"""
        return f"处理: {input}"
    
    async def ainvoke(self, input, config=None):
        """异步调用"""
        return f"异步处理: {input}"
    
    def batch(self, inputs, config=None):
        """批量处理"""
        return [self.invoke(i) for i in inputs]
    
    async def abatch(self, inputs, config=None):
        """异步批量处理"""
        return [await self.ainvoke(i) for i in inputs]
```

**Runnable 的优势**

```python
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

# 所有组件都是 Runnable
llm = ChatOpenAI()
prompt = ChatPromptTemplate.from_template("翻译成中文: {text}")
parser = StrOutputParser()

# 可以直接组合
chain = prompt | llm | parser

# 支持多种调用方式
result = chain.invoke({"text": "Hello"})              # 同步
result = await chain.ainvoke({"text": "Hello"})      # 异步
results = chain.batch([{"text": "Hello"}, {"text": "World"}])  # 批量
```

### 2.2 提示模板（Prompts）

**基础提示模板**

```python
from langchain_core.prompts import PromptTemplate, ChatPromptTemplate
from langchain_core.messages import HumanMessage, SystemMessage

# 字符串提示
prompt = PromptTemplate(
    input_variables=["name", "age"],
    template="我叫 {name}，今年 {age} 岁"
)

# 聊天提示
chat_prompt = ChatPromptTemplate.from_messages([
    SystemMessage(content="你是一个有帮助的助手"),
    HumanMessage(content="你好"),
])

# 使用模板
text = prompt.format(name="张三", age=25)
messages = chat_prompt.format_messages()
```

**高级提示模板**

```python
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder

# 包含消息历史的提示
chat_prompt = ChatPromptTemplate.from_messages([
    ("system", "你是一个有帮助的助手"),
    MessagesPlaceholder(variable_name="chat_history"),
    ("human", "{input}"),
])

# 使用
messages = chat_prompt.format_messages(
    chat_history=[
        ("human", "你好"),
        ("ai", "你好，有什么我可以帮助的吗？"),
    ],
    input="今天天气怎么样？"
)
```

**动态提示**

```python
from langchain_core.prompts import PromptTemplate
from langchain_core.runnables import RunnablePassthrough

# 根据输入动态生成提示
def get_prompt_based_on_task(task):
    if task == "翻译":
        return PromptTemplate.from_template("翻译成中文: {text}")
    elif task == "总结":
        return PromptTemplate.from_template("总结以下内容: {text}")
    else:
        return PromptTemplate.from_template("处理: {text}")

# 在链中使用
chain = RunnablePassthrough() | get_prompt_based_on_task | llm
```

### 2.3 输出解析器（Output Parsers）

**内置解析器**

```python
from langchain_core.output_parsers import (
    StrOutputParser,           # 字符串
    JsonOutputParser,          # JSON
    PydanticOutputParser,      # Pydantic 模型
    CommaSeparatedListOutputParser,  # 逗号分隔列表
)
from pydantic import BaseModel, Field

# 字符串解析
parser = StrOutputParser()
result = parser.parse("Hello World")

# JSON 解析
json_parser = JsonOutputParser()
result = json_parser.parse('{"name": "张三", "age": 25}')

# Pydantic 解析
class Person(BaseModel):
    name: str = Field(description="名字")
    age: int = Field(description="年龄")

pydantic_parser = PydanticOutputParser(pydantic_object=Person)
result = pydantic_parser.parse('{"name": "张三", "age": 25}')

# 列表解析
list_parser = CommaSeparatedListOutputParser()
result = list_parser.parse("苹果, 香蕉, 橙子")  # ['苹果', '香蕉', '橙子']
```

**自定义解析器**

```python
from langchain_core.output_parsers import BaseOutputParser

class CustomParser(BaseOutputParser):
    """自定义解析器"""
    
    def parse(self, text: str):
        """解析输出"""
        # 自定义解析逻辑
        lines = text.strip().split('\n')
        return {
            "title": lines[0] if lines else "",
            "content": '\n'.join(lines[1:]) if len(lines) > 1 else ""
        }

# 使用
parser = CustomParser()
result = parser.parse("标题\n内容第一行\n内容第二行")
```

### 2.4 链式调用（Chaining）

**基础链式调用**

```python
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

# 创建组件
llm = ChatOpenAI(model="gpt-3.5-turbo")
prompt = ChatPromptTemplate.from_template("翻译成中文: {text}")
parser = StrOutputParser()

# 链式调用（使用 | 操作符）
chain = prompt | llm | parser

# 执行
result = chain.invoke({"text": "Hello World"})
print(result)  # 输出中文翻译
```

**复杂链式调用**

```python
from langchain_core.runnables import RunnablePassthrough, RunnableLambda

# 多步骤链
chain = (
    {
        "text": RunnablePassthrough(),
        "language": RunnableLambda(lambda x: "中文")
    }
    | ChatPromptTemplate.from_template("翻译成 {language}: {text}")
    | llm
    | StrOutputParser()
)

result = chain.invoke("Hello World")
```

---

## 三、记忆管理（Memory）

### 3.1 对话记忆

```python
from langchain_core.memory import ConversationBufferMemory
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder

# 创建记忆
memory = ConversationBufferMemory(return_messages=True)

# 创建提示（包含记忆）
prompt = ChatPromptTemplate.from_messages([
    ("system", "你是一个有帮助的助手"),
    MessagesPlaceholder(variable_name="chat_history"),
    ("human", "{input}"),
])

# 保存对话
memory.save_context(
    {"input": "你好"},
    {"output": "你好，有什么我可以帮助的吗？"}
)

# 加载对话历史
history = memory.load_memory_variables({})
print(history)
```

### 3.2 摘要记忆

```python
from langchain_core.memory import ConversationSummaryMemory
from langchain_openai import ChatOpenAI

# 创建摘要记忆
memory = ConversationSummaryMemory(
    llm=ChatOpenAI(),
    buffer="",
)

# 保存多个对话
for i in range(5):
    memory.save_context(
        {"input": f"问题 {i}"},
        {"output": f"回答 {i}"}
    )

# 获取摘要
summary = memory.load_memory_variables({})
print(summary)  # 对话的摘要
```

### 3.3 向量存储记忆

```python
from langchain_core.memory import VectorStoreMemory
from langchain_community.vectorstores import FAISS
from langchain_openai import OpenAIEmbeddings

# 创建向量存储记忆
embeddings = OpenAIEmbeddings()
vectorstore = FAISS.from_texts([], embeddings)

memory = VectorStoreMemory(
    vectorstore=vectorstore,
    embedding_key="input",
    memory_key="history",
)

# 保存重要信息
memory.save_context(
    {"input": "我叫张三"},
    {"output": "很高兴认识你"}
)

# 检索相关记忆
relevant = memory.load_memory_variables({"input": "你叫什么名字？"})
print(relevant)
```

---

## 四、检索增强生成（RAG）

### 4.1 文档加载和分割

```python
from langchain_community.document_loaders import (
    TextLoader,
    PDFLoader,
    WebBaseLoader,
)
from langchain_text_splitters import RecursiveCharacterTextSplitter

# 加载文档
loader = TextLoader("document.txt")
documents = loader.load()

# 分割文档
splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,
    chunk_overlap=200,
    separators=["\n\n", "\n", " ", ""]
)
docs = splitter.split_documents(documents)

# 打印文档
for doc in docs[:3]:
    print(f"内容: {doc.page_content[:100]}...")
    print(f"元数据: {doc.metadata}")
```

### 4.2 向量存储

```python
from langchain_community.vectorstores import FAISS, Chroma
from langchain_openai import OpenAIEmbeddings

# 创建嵌入
embeddings = OpenAIEmbeddings(model="text-embedding-3-small")

# 使用 FAISS
vector_store = FAISS.from_documents(docs, embeddings)

# 保存和加载
vector_store.save_local("faiss_index")
loaded_store = FAISS.load_local("faiss_index", embeddings)

# 相似度搜索
query = "什么是机器学习？"
results = vector_store.similarity_search(query, k=5)

for result in results:
    print(f"相关文档: {result.page_content[:100]}...")
    print(f"相似度分数: {result.metadata.get('score', 'N/A')}")
```

### 4.3 检索链

```python
from langchain_core.runnables import RunnablePassthrough
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

# 创建检索器
retriever = vector_store.as_retriever(search_kwargs={"k": 5})

# 创建 RAG 链
def format_docs(docs):
    return "\n\n".join([d.page_content for d in docs])

rag_prompt = ChatPromptTemplate.from_template("""
基于以下上下文回答问题：

上下文：
{context}

问题：{question}

答案：
""")

rag_chain = (
    {
        "context": retriever | format_docs,
        "question": RunnablePassthrough()
    }
    | rag_prompt
    | llm
    | StrOutputParser()
)

# 使用
answer = rag_chain.invoke("什么是机器学习？")
print(answer)
```

---

## 五、代理和工具（Agents & Tools）

### 5.1 定义工具

```python
from langchain_core.tools import tool
from typing import Annotated

@tool
def add(a: Annotated[int, "第一个数字"], 
        b: Annotated[int, "第二个数字"]) -> int:
    """两个数字相加"""
    return a + b

@tool
def multiply(a: Annotated[int, "第一个数字"], 
             b: Annotated[int, "第二个数字"]) -> int:
    """两个数字相乘"""
    return a * b

# 工具列表
tools = [add, multiply]

# 查看工具信息
for tool in tools:
    print(f"工具: {tool.name}")
    print(f"描述: {tool.description}")
    print(f"参数: {tool.args}")
```

### 5.2 创建代理

```python
from langchain_openai import ChatOpenAI
from langchain.agents import create_tool_calling_agent, AgentExecutor
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder

# 创建 LLM
llm = ChatOpenAI(model="gpt-3.5-turbo")

# 创建提示
prompt = ChatPromptTemplate.from_messages([
    ("system", "你是一个有帮助的数学助手"),
    MessagesPlaceholder(variable_name="chat_history"),
    ("human", "{input}"),
    MessagesPlaceholder(variable_name="agent_scratchpad"),
])

# 创建代理
agent = create_tool_calling_agent(llm, tools, prompt)

# 创建执行器
executor = AgentExecutor(agent=agent, tools=tools, verbose=True)

# 执行
result = executor.invoke({"input": "计算 5 + 3 的结果"})
print(result["output"])
```

### 5.3 自定义工具

```python
from langchain_core.tools import BaseTool
from typing import Optional

class WeatherTool(BaseTool):
    """天气查询工具"""
    
    name = "weather"
    description = "查询指定城市的天气"
    
    def _run(self, city: str) -> str:
        """同步执行"""
        # 调用天气 API
        return f"{city} 的天气是晴天，温度 25°C"
    
    async def _arun(self, city: str) -> str:
        """异步执行"""
        return await self._run(city)

# 使用自定义工具
weather_tool = WeatherTool()
tools = [add, multiply, weather_tool]

# 创建新的代理
agent = create_tool_calling_agent(llm, tools, prompt)
executor = AgentExecutor(agent=agent, tools=tools, verbose=True)

result = executor.invoke({"input": "北京的天气怎么样？"})
```

---

## 六、异步编程

### 6.1 异步调用

```python
import asyncio
from langchain_openai import ChatOpenAI

async def async_example():
    """异步示例"""
    llm = ChatOpenAI()
    
    # 异步调用
    result = await llm.ainvoke("你好")
    print(result)
    
    # 异步批量处理
    results = await llm.abatch(["你好", "再见", "谢谢"])
    for result in results:
        print(result)

# 运行异步代码
asyncio.run(async_example())
```

### 6.2 异步链

```python
async def async_chain_example():
    """异步链示例"""
    chain = prompt | llm | parser
    
    # 异步调用链
    result = await chain.ainvoke({"text": "Hello"})
    print(result)
    
    # 异步流式处理
    async for chunk in chain.astream({"text": "Hello"}):
        print(chunk, end="", flush=True)

asyncio.run(async_chain_example())
```

---

## 七、流式处理（Streaming）

### 7.1 同步流式处理

```python
# 流式处理
for chunk in chain.stream({"text": "Hello"}):
    print(chunk, end="", flush=True)

print()  # 换行
```

### 7.2 异步流式处理

```python
async def stream_example():
    """异步流式处理"""
    async for chunk in chain.astream({"text": "Hello"}):
        print(chunk, end="", flush=True)

asyncio.run(stream_example())
```

### 7.3 流式处理 API

```python
from fastapi import FastAPI
from fastapi.responses import StreamingResponse

app = FastAPI()

@app.post("/stream")
async def stream_endpoint(text: str):
    """流式 API 端点"""
    async def generate():
        async for chunk in chain.astream({"text": text}):
            yield chunk
    
    return StreamingResponse(generate(), media_type="text/plain")
```

---

## 八、最佳实践

### 8.1 错误处理

```python
from langchain_core.exceptions import LangChainException

try:
    result = chain.invoke({"text": "Hello"})
except LangChainException as e:
    print(f"LangChain 错误: {e}")
except Exception as e:
    print(f"未知错误: {e}")
```

### 8.2 日志记录

```python
import logging

# 配置日志
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# 在链中添加日志
def log_input(x):
    logger.debug(f"输入: {x}")
    return x

chain_with_logging = (
    RunnableLambda(log_input)
    | prompt
    | llm
    | parser
)
```

### 8.3 性能优化

```python
from langchain_core.caches import InMemoryCache
from langchain_core.globals import set_llm_cache

# 启用缓存
set_llm_cache(InMemoryCache())

# 批量处理
inputs = [{"text": f"Hello {i}"} for i in range(100)]
results = chain.batch(inputs)

# 异步并发
import asyncio
tasks = [chain.ainvoke(inp) for inp in inputs]
results = asyncio.run(asyncio.gather(*tasks))
```

---

## 九、实战项目示例

### 9.1 问答系统

```python
from langchain_community.document_loaders import WebBaseLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser

# 1. 加载文档
loader = WebBaseLoader("https://example.com/docs")
docs = loader.load()

# 2. 分割文档
splitter = RecursiveCharacterTextSplitter(chunk_size=1000)
split_docs = splitter.split_documents(docs)

# 3. 创建向量存储
embeddings = OpenAIEmbeddings()
vectorstore = FAISS.from_documents(split_docs, embeddings)

# 4. 创建检索器
retriever = vectorstore.as_retriever()

# 5. 创建 QA 链
llm = ChatOpenAI()
prompt = ChatPromptTemplate.from_template("""
基于以下文档回答问题：
{context}

问题：{question}
""")

qa_chain = (
    {
        "context": retriever | (lambda docs: "\n".join([d.page_content for d in docs])),
        "question": RunnablePassthrough()
    }
    | prompt
    | llm
    | StrOutputParser()
)

# 6. 使用
answer = qa_chain.invoke("什么是 LangChain？")
print(answer)
```

### 9.2 多轮对话系统

```python
from langchain_core.memory import ConversationBufferMemory
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder

# 创建记忆
memory = ConversationBufferMemory(return_messages=True)

# 创建提示
prompt = ChatPromptTemplate.from_messages([
    ("system", "你是一个有帮助的助手"),
    MessagesPlaceholder(variable_name="chat_history"),
    ("human", "{input}"),
])

# 创建链
chat_chain = prompt | llm | StrOutputParser()

# 对话循环
def chat():
    while True:
        user_input = input("你: ")
        if user_input.lower() == "exit":
            break
        
        # 加载历史
        history = memory.load_memory_variables({})
        
        # 生成回复
        response = chat_chain.invoke({
            "chat_history": history.get("history", []),
            "input": user_input
        })
        
        print(f"助手: {response}")
        
        # 保存对话
        memory.save_context({"input": user_input}, {"output": response})

chat()
```

---

## 十、总结

LangChain 0.1.0+ 的关键改进：

✅ **模块化架构**：更清晰的组织结构
✅ **Runnable 接口**：统一的调用方式
✅ **完整的异步支持**：高性能应用
✅ **更好的类型提示**：开发体验提升
✅ **丰富的集成**：支持多种 LLM 和工具

学习路径：
1. 理解 Runnable 接口
2. 掌握链式调用
3. 学习 RAG 技术
4. 实现代理和工具
5. 构建完整应用

---

**关键词**：LangChain、Runnable、RAG、代理、异步编程

**推荐资源**：
- [LangChain 官方文档](https://python.langchain.com/)
- [LangChain GitHub](https://github.com/langchain-ai/langchain)
- [LangChain 社区](https://discord.gg/langchain)
