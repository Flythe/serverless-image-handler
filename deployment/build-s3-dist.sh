# param 1: S3 bucket name
# param 2: version number
# (optional) param 3: lambda function name OR stack name
# (optional) param 4: when creating a stack this is the source S3 bucket for the images
# (optional) param 5: when createing a stack this is the security key

echo "------------------------------------------------------------------------------"
echo "Setup the dist folder"
echo "------------------------------------------------------------------------------"
rm -r dist
mkdir dist

echo "------------------------------------------------------------------------------"
echo "Copy in the template"
echo "------------------------------------------------------------------------------"
cp *.template dist/

replace="s/%%BUCKET_NAME%%/$1/g"
sed -i -e $replace dist/*.template

replace="s/%%VERSION%%/$2/g"
sed -i -e $replace dist/*.template

cd ../source

echo "------------------------------------------------------------------------------"
echo "Package the image-handler code"
echo "------------------------------------------------------------------------------"
npm install
npm run build
cp dist/image-handler.zip ../deployment/dist/image-handler.zip

cd ../deployment

echo "------------------------------------------------------------------------------"
echo "Upload to S3 bucket"
echo "------------------------------------------------------------------------------"
aws s3 cp ./dist/ s3://$1/$2/ --recursive

## Uncomment if you want to create a stack automatically
# echo "------------------------------------------------------------------------------"
# echo "Creating the stack"
# echo "------------------------------------------------------------------------------"
# aws cloudformation create-stack \
#     --stack-name $3 \
#     --capabilities CAPABILITY_NAMED_IAM\
#     --template-url https://s3.amazonaws.com/$1/$2/serverless-image-handler.template \
#     --parameters ParameterKey=SourceBuckets,ParameterValue=$4 ParameterKey=SecurityKey,ParameterValue=$5

## Uncomment if you want to publish code directly to your lambda function
# echo "------------------------------------------------------------------------------"
# echo "Updating lambda function"
# echo "------------------------------------------------------------------------------"
# aws lambda update-function-code \
#     --function-name $3 \
#     --s3-bucket $1 \
#     --s3-key $2/image-handler.zip \
#     --publish