/*********************************************************************************************************************
 *  Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.                                           *
 *                                                                                                                    *
 *  Licensed under the Amazon Software License (the "License"). You may not use this file except in compliance        *
 *  with the License. A copy of the License is located at                                                             *
 *                                                                                                                    *
 *      http://aws.amazon.com/asl/                                                                                    *
 *                                                                                                                    *
 *  or in the "license" file accompanying this file. This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES *
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    *
 *  and limitations under the License.                                                                                *
 *********************************************************************************************************************/

const ImageRequest = require('../image-request');
let assert = require('assert');

// ----------------------------------------------------------------------------
// [async] setup()
// ----------------------------------------------------------------------------
describe('setup()', function() {
    describe('001/defaultImageRequest', function() {
        it(`Should pass when a default image request is provided and populate
            the ImageRequest object with the proper values`, async function() {
            // Arrange
            const event = {
                path : '/eyJidWNrZXQiOiJ2YWxpZEJ1Y2tldCIsImtleSI6InZhbGlkS2V5IiwiZWRpdHMiOnsiZ3JheXNjYWxlIjp0cnVlfX0='
            }
            process.env = {
                SOURCE_BUCKETS : "validBucket, validBucket2"
            }
            // ----
            const S3 = require('aws-sdk/clients/s3');
            const sinon = require('sinon');
            const getObject = S3.prototype.getObject = sinon.stub();
            getObject.withArgs({Bucket: 'validBucket', Key: 'validKey'}).returns({
                promise: () => { return {
                  Body: Buffer.from('SampleImageContent\n')
                }}
            })
            // Act
            const imageRequest = new ImageRequest();
            await imageRequest.setup(event);
            const expectedResult = {
                bucket: 'validBucket',
                key: 'validKey',
                edits: { grayscale: true },
                originalImage: Buffer.from('SampleImageContent\n')
            }
            // Assert
            assert.deepEqual(imageRequest, expectedResult);
        });
    });
    describe('002/errorCase', function() {
        it(`Should pass when an error is caught`, async function() {
            // Assert
            const event = {
                path : 'invalidPathHere'
            }
            
            // Act
            const imageRequest = new ImageRequest();
            // Assert
            await imageRequest.setup(event).then(() => {
                console.log(data);
            }).catch((err) => {
                console.log(err);
                assert.deepEqual(err.code, 'RequestTypeError');
            })
        });
    });
});
// ----------------------------------------------------------------------------
// getOriginalImage()
// ----------------------------------------------------------------------------
describe('getOriginalImage()', function() {
    describe('001/imageExists', function() {
        it(`Should pass if the proper bucket name and key are supplied,
            simulating an image file that can be retrieved`, async function() {
            // Arrange
            const S3 = require('aws-sdk/clients/s3');
            const sinon = require('sinon');
            const getObject = S3.prototype.getObject = sinon.stub();
            getObject.withArgs({Bucket: 'validBucket', Key: 'validKey'}).returns({
                promise: () => { return {
                  Body: Buffer.from('SampleImageContent\n')
                }}
            })
            // Act
            const imageRequest = new ImageRequest();
            const result = await imageRequest.getOriginalImage('validBucket', 'validKey');
            // Assert
            assert.deepEqual(result, Buffer.from('SampleImageContent\n'));
        });
    });
    describe('002/imageDoesNotExist', async function() {
        it(`Should throw an error if an invalid bucket or key name is provided,
            simulating a non-existant original image`, async function() {
            // Arrange
            const S3 = require('aws-sdk/clients/s3');
            const sinon = require('sinon');
            const getObject = S3.prototype.getObject = sinon.stub();
            getObject.withArgs({Bucket: 'invalidBucket', Key: 'invalidKey'}).returns({
                promise: () => {
                    return Promise.reject({
                        code: 500,
                        message: 'SimulatedInvalidParameterException'
                    })
                }
            });
            // Act
            const imageRequest = new ImageRequest();
            // Assert
            imageRequest.getOriginalImage('invalidBucket', 'invalidKey').then((result) => {
                assert.equal(typeof result, Error);
            }).catch((err) => {
                console.log(err)
            })
        });
    });
});

// ----------------------------------------------------------------------------
// parseImageBucket()
// ----------------------------------------------------------------------------
describe('parseImageBucket()', function() {
    describe('001/defaultRequestType/bucketSpecifiedInRequest/allowed', function() {
        it(`Should pass if the bucket name is provided in the image request
            and has been whitelisted in SOURCE_BUCKETS`, function() {
            // Arrange
            const event = {
                path : '/eyJidWNrZXQiOiJhbGxvd2VkQnVja2V0MDAxIiwia2V5Ijoic2FtcGxlSW1hZ2VLZXkwMDEuanBnIiwiZWRpdHMiOnsiZ3JheXNjYWxlIjoidHJ1ZSJ9fQ=='
            }
            process.env = {
                SOURCE_BUCKETS : "allowedBucket001, allowedBucket002"
            }
            // Act
            const imageRequest = new ImageRequest();
            const result = imageRequest.parseImageBucket(event, 'Default');
            // Assert
            const expectedResult = 'allowedBucket001';
            assert.deepEqual(result, expectedResult);
        });
    });
    describe('002/defaultRequestType/bucketSpecifiedInRequest/notAllowed', function() {
        it(`Should throw an error if the bucket name is provided in the image request
            but has not been whitelisted in SOURCE_BUCKETS`, function() {
            // Arrange
            const event = {
                path : '/eyJidWNrZXQiOiJhbGxvd2VkQnVja2V0MDAxIiwia2V5Ijoic2FtcGxlSW1hZ2VLZXkwMDEuanBnIiwiZWRpdHMiOnsiZ3JheXNjYWxlIjoidHJ1ZSJ9fQ=='
            }
            process.env = {
                SOURCE_BUCKETS : "allowedBucket003, allowedBucket004"
            }
            // Act
            const imageRequest = new ImageRequest();
            // Assert
            assert.throws(function() {
                imageRequest.parseImageBucket(event, 'Default');
            }, Object, {
                status: 403,
                code: 'ImageBucket::CannotAccessBucket',
                message: 'The bucket you specified could not be accessed. Please check that the bucket is specified in your SOURCE_BUCKETS.'
            });
        });
    });
    describe('003/defaultRequestType/bucketNotSpecifiedInRequest', function() {
        it(`Should pass if the image request does not contain a source bucket
            but SOURCE_BUCKETS contains at least one bucket that can be
            used as a default`, function() {
            // Arrange
            const event = {
                path : '/eyJrZXkiOiJzYW1wbGVJbWFnZUtleTAwMS5qcGciLCJlZGl0cyI6eyJncmF5c2NhbGUiOiJ0cnVlIn19=='
            }
            process.env = {
                SOURCE_BUCKETS : "allowedBucket001, allowedBucket002"
            }
            // Act
            const imageRequest = new ImageRequest();
            const result = imageRequest.parseImageBucket(event, 'Default');
            // Assert
            const expectedResult = 'allowedBucket001';
            assert.deepEqual(result, expectedResult);
        });
    });
});

// ----------------------------------------------------------------------------
// getImageEdits()
// ----------------------------------------------------------------------------
describe('getImageEdits()', function() {
    describe('001/defaultRequestType', function() {
        it(`Should pass if the proper result is returned for a sample base64-
            encoded image request`, function() {
            // Arrange
            const event = {
                path : '/eyJlZGl0cyI6eyJncmF5c2NhbGUiOiJ0cnVlIiwicm90YXRlIjo5MCwiZmxpcCI6InRydWUifX0='
            }
            // Act
            const imageRequest = new ImageRequest();
            const result = imageRequest.getImageEdits(event, 'Default');
            // Assert
            const expectedResult = {
                grayscale: 'true',
                rotate: 90,
                flip: 'true'
            }
            assert.deepEqual(result, expectedResult);
        });
    });
});

// ----------------------------------------------------------------------------
// getImageKey()
// ----------------------------------------------------------------------------
describe('getImageKey()', function() {
    describe('001/defaultRequestType', function() {
        it(`Should pass if an image key value is provided in the default
            request format`, function() {
            // Arrange
            const event = {
                path : '/eyJidWNrZXQiOiJteS1zYW1wbGUtYnVja2V0Iiwia2V5Ijoic2FtcGxlLWltYWdlLTAwMS5qcGcifQ=='
            }
            // Act
            const imageRequest = new ImageRequest();
            const result = imageRequest.getImageKey(event, 'Default');
            // Assert
            const expectedResult = 'sample-image-001.jpg';
            assert.deepEqual(result, expectedResult);
        });
    });
});

// ----------------------------------------------------------------------------
// isValidRequest()
// ----------------------------------------------------------------------------
describe('isValidRequest()', function() {
    describe('001/defaultRequestType', function() {
        it(`Should pass if the method detects a default request`, function() {
            // Arrange
            const event = {
                path: '/eyJidWNrZXQiOiJteS1zYW1wbGUtYnVja2V0Iiwia2V5IjoibXktc2FtcGxlLWtleSIsImVkaXRzIjp7ImdyYXlzY2FsZSI6dHJ1ZX19'
            }
            process.env = {};
            // Act
            const imageRequest = new ImageRequest();
            const result = imageRequest.isValidRequest(event);
            // Assert
            const expectedResult = 'Default';
            assert.deepEqual(result, expectedResult);
        });
    });
    describe('002/elseCondition', function() {
        it(`Should throw an error if the method cannot determine the request
            type based on the three groups given`, function() {
            // Arrange
            const event = {
                path : '12x12e24d234r2ewxsad123d34r'
            }
            process.env = {};
            // Act
            const imageRequest = new ImageRequest();
            // Assert
            assert.throws(function() {
                const a = imageRequest.isValidRequest(event);
            }, Object, {
                status: 400,
                code: 'RequestType::CannotDetermineRequestType',
                message: 'The type of request you are making could not be properly routed. Please check your request syntax and refer to the documentation for additional guidance.'
            });
        });
    });
});

// ----------------------------------------------------------------------------
// decodeRequest()
// ----------------------------------------------------------------------------
describe('decodeRequest()', function() {
    describe('001/validRequestPathSpecified', function() {
        it(`Should pass if a valid base64-encoded path has been specified`,
            function() {
            // Arrange
            const event = {
                path : '/eyJidWNrZXQiOiJidWNrZXQtbmFtZS1oZXJlIiwia2V5Ijoia2V5LW5hbWUtaGVyZSJ9'
            }
            // Act
            const imageRequest = new ImageRequest();
            const result = imageRequest.decodeRequest(event);
            // Assert
            const expectedResult = {
                bucket: 'bucket-name-here',
                key: 'key-name-here'
            };
            assert.deepEqual(result, expectedResult);
        });
    });
    describe('002/invalidRequestPathSpecified', function() {
        it(`Should throw an error if a valid base64-encoded path has not been specified`,
            function() {
            // Arrange
            const event = {
                path : '/someNonBase64EncodedContentHere'
            }
            // Act
            const imageRequest = new ImageRequest();
            // Assert
            assert.throws(function() {
                imageRequest.decodeRequest(event);
            }, Object, {
                status: 400,
                code: 'DecodeRequest::CannotDecodeRequest',
                message: 'The image request you provided could not be decoded. Please check that your request is base64 encoded properly and refer to the documentation for additional guidance.'
            });
        });
    });
    describe('003/noPathSpecified', function() {
        it(`Should throw an error if no path is specified at all`,
            function() {
            // Arrange
            const event = {}
            // Act
            const imageRequest = new ImageRequest();
            // Assert
            assert.throws(function() {
                imageRequest.decodeRequest(event);
            }, Object, {
                status: 400,
                code: 'DecodeRequest::CannotReadPath',
                message: 'The URL path you provided could not be read. Please ensure that it is properly formed according to the solution documentation.'
            });
        });
    });
});

// ----------------------------------------------------------------------------
// getAllowedSourceBuckets()
// ----------------------------------------------------------------------------
describe('getAllowedSourceBuckets()', function() {
    describe('001/sourceBucketsSpecified', function() {
        it(`Should pass if the SOURCE_BUCKETS environment variable is not empty
            and contains valid inputs`, function() {
            // Arrange
            process.env = {
                SOURCE_BUCKETS: 'allowedBucket001, allowedBucket002'
            }
            // Act
            const imageRequest = new ImageRequest();
            const result = imageRequest.getAllowedSourceBuckets();
            // Assert
            const expectedResult = ['allowedBucket001', 'allowedBucket002'];
            assert.deepEqual(result, expectedResult);
        });
    });
    describe('002/noSourceBucketsSpecified', function() {
        it(`Should throw an error if the SOURCE_BUCKETS environment variable is
            empty or does not contain valid values`, function() {
            // Arrange
            process.env = {};
            // Act
            const imageRequest = new ImageRequest();
            // Assert
            assert.throws(function() {
                imageRequest.getAllowedSourceBuckets();
            }, Object, {
                status: 400,
                code: 'GetAllowedSourceBuckets::NoSourceBuckets',
                message: 'The SOURCE_BUCKETS variable could not be read. Please check that it is not empty and contains at least one source bucket, or multiple buckets separated by commas. Spaces can be provided between commas and bucket names, these will be automatically parsed out when decoding.'
            });
        });
    });
})