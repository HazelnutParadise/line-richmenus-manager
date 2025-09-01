FROM golang:1.25-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

CMD ["go", "build", "-o", "main", "./main.go"]

FROM scratch
COPY --from=builder /app/main .
CMD ["./main"]