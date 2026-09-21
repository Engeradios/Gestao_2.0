#!/bin/bash

docker ps -a

echo
echo "--------------------------------"

docker images

echo
echo "--------------------------------"

docker network ls

echo
echo "--------------------------------"

docker volume ls
