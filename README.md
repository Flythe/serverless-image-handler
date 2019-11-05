
# AWS Serverless Image Handler Lambda wrapper for SharpJS
A solution to dynamically handle images on the fly, utilising [Sharp](https://sharp.pixelplumbing.com/en/stable/).
To deploy a version without any customisation there is a ready to use version, additional details and documentation are available [here]( https://aws.amazon.com/solutions/serverless-image-handler/).

The original repo can be found [here](https://github.com/awslabs/serverless-image-handler). The documentation and readme of the original repos is really minimal so I've attempted a restructure below.

The Amazon CloudFormation template has been heavily modified as well to remove a bunch of unused services that were being installed. At the moment this template will set up: a CloudFront, API Gateway, and a single Lambda function.

## Prerequisites
To deploy the script you need two Amazon S3 buckets. One bucket will contain the code distributable and the CloudFormation template. The other will contain the images that will be served.

# Installation
### Automatic deployment
* Configure the bucket name of your target Amazon S3 distribution bucket. **Note:** This requires two buckets, one named 'my-bucket-name' from which the images will be served and another 'my-deploy-bucket' for the code distributable. Also, the assets in the buckets should be publicly accessible.

* Navigate to the deployment folder and build the distributable
```bash
cd serverless-image-handler/deployment
sudo ./build-s3-dist.sh MY_DEPLOY_BUCKET VERSION
```

* The build script will automatically upload the distributable to the 'my-deploy-bucket'. **Note:** you can also auto-deploy the stack to CloudFormation with this script or auto-update an lambda that has already been deployed, check the comments in ```deployment/build-s3-dist.sh```.
* If you've chosen to have the script automatically deploy the CloudFormation stack you are done! Wait a couple of minutes for all the components to be prepared and go to the [CloudFormation console](https://console.aws.amazon.com/cloudformation) to fetch your API endpoint under the ```Outputs``` tab.

### Manual deployment - Deploy CloudFormation
If you choose to do the deployment manually follow these steps:
* Get the link of the serverless-image-handler.template uploaded to your Amazon S3 bucket (ie. 'my-deploy-bucket').
```
https://my-deploy-bucket.s3.amazonaws.com/my-version/serverless-image-handler.template
```
* Deploy the Serverless Image Handler solution by launching a new AWS CloudFormation stack. This may take a couple of minutes.
* Done!

### Manual deployment - Update Lambda function
If you've already deployed the template and just want to update the Lambda function code do the following:
* Go to the Lambda Management Console
* Under ```Function code```, select ```upload a file from Amazon S3``` as ```Code entry type```
* Enter the link of the image-handler.zip distribution
```
https://my-deploy-bucket.s3.amazonaws.com/my-version/image-handler.zip
```
* Hit ```Save``` up top and then under ```Actions``` select ```Publish new version```
* Done!

# Basic usage
After creating the CloudFormation stack the image handler has an endpoint that accepts base64 encoded JSON objects describing [Sharp](https://sharp.pixelplumbing.com/en/stable/) functions.

* Build the url by defining a JSON object of the required edits
```javascript
const request = {
  "bucket": "my-bucket",
  "key": "some-img.jpg",
  "edits": {
    "resize": {
      "width": 200,
      "height": 200
    }
  }
}
```

* Encode the object in base64
```javascript
const jsonString = JSON.stringify(request)
const request = btoa(jsonString)

console.log(request)

// Result: eyJidWNrZXQiOiJteS1idWNrZXQiLCAia2V5Ijoic29tZS1pbWcuanBnIiwgImVkaXRzIjogeyJyZXNpemUiOiB7IndpZHRoIjogMzAwLCAiaGVpZ2h0IjogMzAwIH19fQ==
```

* Now use the base64 encoded string to access the image!
```
https://my-cloud-front.cloudfront.net/eyJidWNrZXQiOiJteS1idWNrZXQiLCAia2V5Ijoic29tZS1pbWcuanBnIiwgImVkaXRzIjogeyJyZXNpemUiOiB7IndpZHRoIjogMzAwLCAiaGVpZ2h0IjogMzAwIH19fQ==
```

# Customisation
* Clone this repo
* Install the vagrant box, it pre-installs all the necessary libraries
```bash
vagrant up
vagrant ssh
```

* Make the desired code changes
* Run unit tests to make sure added customisation passes the tests
```bash
cd ./source
npm test
```

* Test your code by deploying the CloudFormation stack, see [installation notes](#installation).