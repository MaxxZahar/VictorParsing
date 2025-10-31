FROM 24-alpine

WORKDIR /app

RUN npm install puppeteer

COPY node_modules package.json package-lock.json ./

COPY ..

EXPOSE 8000

# CMD ["node", "run", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]