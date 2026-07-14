#!/bin/sh

git pull

docker compose --env-file .env.local down

docker compose --env-file .env.local up --build -d
