# AWS Deployment Guide for RDCircuitry

This document outlines the steps to deploy RDCircuitry to AWS using ECR and ECS.

-----------------------------------------------------------------
## Command Line CLI in Bash Terminal (within Cursor)
-----------------------------------------------------------------
### MAKE SURE COMMANDS ARE USING POWERSHELL TERMINAL

### Retrieve an authentication token and authenticate your Docker client to your registry. Use the AWS TOOLS for PowerShell:
aws ecr get-login-password --region us-west-2 | docker login --username AWS --password-stdin 026090556714.dkr.ecr.us-west-2.amazonaws.com

### Build your Docker image using the following command
docker build -t rdcircuitry-frontend .
docker build -t rdcircuitry-backend .

### After the build completes, tag your image so you can push the image to this repository
docker tag rdcircuitry-frontend:latest 026090556714.dkr.ecr.us-west-2.amazonaws.com/rdcircuitry-frontend:latest
docker tag rdcircuitry-backend:latest 026090556714.dkr.ecr.us-west-2.amazonaws.com/rdcircuitry-backend:latest

### Run the following command to push this image to your newly created AWS repository
docker push 026090556714.dkr.ecr.us-west-2.amazonaws.com/rdcircuitry-frontend:latest
docker push 026090556714.dkr.ecr.us-west-2.amazonaws.com/rdcircuitry-backend:latest


## Prerequisites

- AWS CLI installed and configured
- Docker installed locally
- Valid AWS account with appropriate permissions
- Domain name (optional, for Route53 setup)

## 1. Create ECR Repositories

```bash
# Create ECR repository for frontend
aws ecr create-repository --repository-name rdcircuitry-frontend

# Create ECR repository for backend
aws ecr create-repository --repository-name rdcircuitry-backend
```

## 2. Build and Push Docker Images

```bash
# Authenticate Docker to AWS ECR
aws ecr get-login-password --region us-west-2 | docker login --username AWS --password-stdin [AWS_ACCOUNT_ID].dkr.ecr.us-west-2.amazonaws.com

# Build images (alternative to using docker-build.sh)
docker-compose build

# Tag and push frontend image
docker tag rdcircuitry_frontend:latest [AWS_ACCOUNT_ID].dkr.ecr.us-west-2.amazonaws.com/rdcircuitry-frontend:latest
docker push [AWS_ACCOUNT_ID].dkr.ecr.us-west-2.amazonaws.com/rdcircuitry-frontend:latest

# Tag and push backend image
docker tag rdcircuitry_backend:latest [AWS_ACCOUNT_ID].dkr.ecr.us-west-2.amazonaws.com/rdcircuitry-backend:latest
docker push [AWS_ACCOUNT_ID].dkr.ecr.us-west-2.amazonaws.com/rdcircuitry-backend:latest
```

## 3. Create ECS Cluster

```bash
aws ecs create-cluster --cluster-name rdcircuitry-cluster
```
RESPONSE OBJECT:
$ aws ecs create-cluster --cluster-name rdcircuitry-cluster
{
    "cluster": {
        "clusterArn": "arn:aws:ecs:us-west-2:026090556714:cluster/rdcircuitry-cluster",
        "clusterName": "rdcircuitry-cluster",
        "status": "ACTIVE",
        "registeredContainerInstancesCount": 0,
        "runningTasksCount": 0,
        "pendingTasksCount": 0,
        "activeServicesCount": 0,
        "statistics": [],
        "tags": [],
        "settings": [
            {
                "name": "containerInsights",
                "value": "disabled"
            }
        ],
        "capacityProviders": [],
        "defaultCapacityProviderStrategy": []
    }
}


## 4. Create Task Definition

Create a task definition file `task-definition.json`:

```json
{
  "family": "rdcircuitry",
  "networkMode": "awsvpc",
  "executionRoleArn": "arn:aws:iam::[AWS_ACCOUNT_ID]:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "frontend",
      "image": "[AWS_ACCOUNT_ID].dkr.ecr.us-west-2.amazonaws.com/rdcircuitry-frontend:latest",
      "essential": true,
      "portMappings": [
        {
          "containerPort": 3000,
          "hostPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        },
        {
          "name": "BACKEND_URL",
          "value": "https://api.yourdomain.com"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/rdcircuitry",
          "awslogs-region": "us-west-2",
          "awslogs-stream-prefix": "frontend"
        }
      }
    },
    {
      "name": "backend",
      "image": "[AWS_ACCOUNT_ID].dkr.ecr.us-west-2.amazonaws.com/rdcircuitry-backend:latest",
      "essential": true,
      "portMappings": [
        {
          "containerPort": 4000,
          "hostPort": 4000,
          "protocol": "tcp"
        },
        {
          "containerPort": 3001,
          "hostPort": 3001,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        },
        {
          "name": "MONGODB_URI",
          "value": "mongodb://your-mongodb-connection-string"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/rdcircuitry",
          "awslogs-region": "us-west-2",
          "awslogs-stream-prefix": "backend"
        }
      }
    }
  ],
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048"
}
```

Register the task definition:

```bash
aws ecs register-task-definition --cli-input-json file://task-definition.json
```

## 5. Create Security Groups

```bash
# Create VPC if needed (note the vpc-id output)
aws ec2 create-vpc --cidr-block 10.0.0.0/16 --tag-specifications 'ResourceType=vpc,Tags=[{Key=Name,Value=rdcircuitry-vpc}]'

# Create security group for load balancer
aws ec2 create-security-group --group-name rdcircuitry-lb-sg --description "Security group for RDCircuitry load balancer" --vpc-id vpc-01865816324c96f8d
aws ec2 authorize-security-group-ingress --group-id sg-03ebca4537156e002 --protocol tcp --port 80 --cidr 0.0.0.0/0
aws ec2 authorize-security-group-ingress --group-id sg-03ebca4537156e002 --protocol tcp --port 443 --cidr 0.0.0.0/0

# Create security group for ECS tasks
aws ec2 create-security-group --group-name rdcircuitry-ecs-sg --description "Security group for RDCircuitry ECS tasks" --vpc-id vpc-xxxxxxxx
aws ec2 authorize-security-group-ingress --group-id sg-03ebca4537156e002 --protocol tcp --port 3000 --source-group sg-03ebca4537156e002
aws ec2 authorize-security-group-ingress --group-id sg-03ebca4537156e002 --protocol tcp --port 4000 --source-group sg-03ebca4537156e002
aws ec2 authorize-security-group-ingress --group-id sg-03ebca4537156e002 --protocol tcp --port 3001 --source-group sg-03ebca4537156e002
```

## 6. Create Load Balancers

```bash
# Create subnets if needed
aws ec2 create-subnet --vpc-id vpc-01865816324c96f8d --cidr-block 10.0.1.0/24 --availability-zone us-west-2a
aws ec2 create-subnet --vpc-id vpc-01865816324c96f8d --cidr-block 10.0.2.0/24 --availability-zone us-west-2b

# Create a Gateway
aws ec2 attach-internet-gateway --vpc-id "vpc-01865816324c96f8d" --internet-gateway-id "igw-09c4e9e495f2243ed" --region us-west-2

# Create Application Load Balancer
aws elbv2 create-load-balancer --name rdcircuitry-alb --subnets subnet-0067d3ef1c3d5a580 subnet-0c46aec3b5d25873d --security-groups sg-03ebca4537156e002 --type application

# Create target groups
aws elbv2 create-target-group --name rdcircuitry-frontend-tg --protocol HTTP --port 3000 --vpc-id vpc-01865816324c96f8d --target-type ip [NOTE REQUIRED: --health-check-path / --health-check-interval-seconds 30]"
aws elbv2 create-target-group --name rdcircuitry-backend-tg --protocol HTTP --port 4000 --vpc-id vpc-01865816324c96f8d --target-type ip [NOTE REQUIRED: --health-check-path / --health-check-interval-seconds 30]"

# Create listeners
aws elbv2 create-listener --load-balancer-arn arn:aws:elasticloadbalancing:us-west-2:026090556714:loadbalancer/app/rdcircuitry-alb/d5ae065bbcd46f3d --protocol HTTP --port 80 --default-actions Type=forward,TargetGroupArn=arn:aws:elasticloadbalancing:us-west-2:026090556714:targetgroup/rdcircuitry-frontend-tg/b61e0e20bf0286ac

# Add path-based routing for backend
aws elbv2 create-rule --listener-arn arn:aws:elasticloadbalancing:us-west-2:026090556714:listener/app/rdcircuitry-alb/d5ae065bbcd46f3d/65288f3e6011fdb5 --priority 10 --conditions Field=path-pattern,Values='/api/*' --actions Type=forward,TargetGroupArn=arn:aws:elasticloadbalancing:us-west-2:026090556714:targetgroup/rdcircuitry-backend-tg/fdf8cdb3ff62d60c
```

## 7. Create ECS Service

```bash
aws ecs create-service \
  --cluster rdcircuitry-cluster \
  --service-name rdcircuitry-service \
  --task-definition rdcircuitry:1 \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-0067d3ef1c3d5a580,subnet-0c46aec3b5d25873d],securityGroups=[sg-03ebca4537156e002],assignPublicIp=ENABLED}" \
  --load-balancers "[{\"targetGroupArn\":\"arn:aws:elasticloadbalancing:us-west-2:026090556714:targetgroup/rdcircuitry-frontend-tg/b61e0e20bf0286ac\",\"containerName\":\"frontend\",\"containerPort\":3000},{\"targetGroupArn\":\"arn:aws:elasticloadbalancing:us-west-2:026090556714:targetgroup/rdcircuitry-backend-tg/fdf8cdb3ff62d60c\",\"containerName\":\"backend\",\"containerPort\":4000}]"
```

## 8. Setup Route53 (Optional)

### 8.1 Create SSL Certificate

```bash
# Request certificate
aws acm request-certificate --domain-name yourdomain.com --validation-method DNS --subject-alternative-names www.yourdomain.com api.yourdomain.com

# Note the certificate ARN and CNAME records for DNS validation
```

### 8.2 Configure DNS

```bash
# Create hosted zone if needed
aws route53 create-hosted-zone --name yourdomain.com --caller-reference $(date +%s)

# Create A record for ALB
aws route53 change-resource-record-sets --hosted-zone-id Z1234567890 --change-batch '{
  "Changes": [
    {
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "yourdomain.com",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "Z35SXDOTRQ7X7K",
          "DNSName": "rdcircuitry-alb-xxxxxxxx.us-west-2.elb.amazonaws.com",
          "EvaluateTargetHealth": true
        }
      }
    },
    {
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "api.yourdomain.com",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "Z35SXDOTRQ7X7K",
          "DNSName": "rdcircuitry-alb-xxxxxxxx.us-west-2.elb.amazonaws.com",
          "EvaluateTargetHealth": true
        }
      }
    }
  ]
}'
```

### 8.3 Update Load Balancer with HTTPS

```bash
# Add HTTPS listener
aws elbv2 create-listener \
  --load-balancer-arn arn:aws:elasticloadbalancing:us-west-2:[AWS_ACCOUNT_ID]:loadbalancer/app/rdcircuitry-alb/xxxxxxxx \
  --protocol HTTPS \
  --port 443 \
  --certificates CertificateArn=arn:aws:acm:us-west-2:[AWS_ACCOUNT_ID]:certificate/xxxxxxxx \
  --default-actions Type=forward,TargetGroupArn=arn:aws:elasticloadbalancing:us-west-2:[AWS_ACCOUNT_ID]:targetgroup/rdcircuitry-frontend-tg/xxxxxxxx

# Add path-based routing for backend on HTTPS
aws elbv2 create-rule \
  --listener-arn arn:aws:elasticloadbalancing:us-west-2:[AWS_ACCOUNT_ID]:listener/app/rdcircuitry-alb/xxxxxxxx/xxxxxxxx \
  --priority 10 \
  --conditions Field=path-pattern,Values='/api/*' \
  --actions Type=forward,TargetGroupArn=arn:aws:elasticloadbalancing:us-west-2:[AWS_ACCOUNT_ID]:targetgroup/rdcircuitry-backend-tg/xxxxxxxx
```

## 9. Verify Deployment

1. Check service status:
   ```bash
   aws ecs describe-services --cluster rdcircuitry-cluster --services rdcircuitry-service
   ```

2. Access application:
   - Frontend: https://yourdomain.com
   - Backend API: https://api.yourdomain.com
   - WebSocket: wss://api.yourdomain.com (port 3001)

## 10. Update Application

```bash
# Build and push new images
docker-compose build
docker tag rdcircuitry_frontend:latest [AWS_ACCOUNT_ID].dkr.ecr.us-west-2.amazonaws.com/rdcircuitry-frontend:latest
docker push [AWS_ACCOUNT_ID].dkr.ecr.us-west-2.amazonaws.com/rdcircuitry-frontend:latest
docker tag rdcircuitry_backend:latest [AWS_ACCOUNT_ID].dkr.ecr.us-west-2.amazonaws.com/rdcircuitry-backend:latest
docker push [AWS_ACCOUNT_ID].dkr.ecr.us-west-2.amazonaws.com/rdcircuitry-backend:latest

# Update service to force redeployment
aws ecs update-service --cluster rdcircuitry-cluster --service rdcircuitry-service --force-new-deployment
``` 