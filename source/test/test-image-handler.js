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

const ImageHandler = require('../image-handler');
let assert = require('assert');
const sharp = require('sharp');

// ----------------------------------------------------------------------------
// [async] process()
// ----------------------------------------------------------------------------
describe('process()', function() {
    describe('001/default', function() {
        it(`Should pass if the output image is different from the input image with edits applied`, async function() {
            // Arrange
            const sinon = require('sinon');
            // ---- Amazon S3 stub
            const S3 = require('aws-sdk/clients/s3');
            const getObject = S3.prototype.getObject = sinon.stub();
            getObject.returns({
                promise: () => { return {
                  Body: new Buffer('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')
                }}
            })
            // ----
            const request = {
                requestType: "default",
                bucket: "sample-bucket",
                key: "sample-image-001.jpg",
                edits: {
                    grayscale: true,
                    flip: true
                },
                originalImage: new Buffer('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')
            }
            // Act
            const imageHandler = new ImageHandler();
            const result = await imageHandler.process(request);
            // Assert
            assert.deepEqual((request.originalImage !== result), true);
        });
    });
    describe('002/withToFormat', function() {
        it(`Should pass if the output image is in a different format than the original image`, async function() {
            // Arrange
            const sinon = require('sinon');
            // ---- Amazon S3 stub
            const S3 = require('aws-sdk/clients/s3');
            const getObject = S3.prototype.getObject = sinon.stub();
            getObject.returns({
                promise: () => { return {
                  Body: new Buffer('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')
                }}
            })
            // ----
            const request = {
                requestType: "default",
                bucket: "sample-bucket",
                key: "sample-image-001.jpg",
                outputFormat: "png",
                originalImage: new Buffer('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')
            }
            // Act
            const imageHandler = new ImageHandler();
            const result = await imageHandler.process(request);
            // Assert
            assert.deepEqual((request.originalImage !== result), true);
        });
    });
    describe('003/noEditsSpecified', function() {
        it(`Should pass if no edits are specified and the original image is returned`, async function() {
            // Arrange
            const sinon = require('sinon');
            // ---- Amazon S3 stub
            const S3 = require('aws-sdk/clients/s3');
            const getObject = S3.prototype.getObject = sinon.stub();
            getObject.returns({
                promise: () => { return {
                  Body: new Buffer('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')
                }}
            })
            // ----
            const request = {
                requestType: "default",
                bucket: "sample-bucket",
                key: "sample-image-001.jpg",
                originalImage: new Buffer('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')
            }
            // Act
            const imageHandler = new ImageHandler();
            const result = await imageHandler.process(request);
            // Assert
            assert.deepEqual(result, 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACXBIWXMAAAsSAAALEgHS3X78AAAADUlEQVQI12P4z8BQDwAEgAF/gtB8VwAAAABJRU5ErkJggg==');
        });
    });
});

// ----------------------------------------------------------------------------
// [async] applyEdits()
// ----------------------------------------------------------------------------
describe('applyEdits()', function() {
    describe('001/standardEdits', function() {
        it(`Should pass if a series of standard edits are provided to the
            function`, async function() {
            // Arrange
            const originalImage = Buffer.from('sampleImageContent');
            const edits = {
                grayscale: true,
                flip: true
            }
            // Act
            const imageHandler = new ImageHandler();
            const result = await imageHandler.applyEdits(originalImage, edits);
            // Assert
            const expectedResult1 = (result.options.greyscale);
            const expectedResult2 = (result.options.flip);
            const combinedResults = (expectedResult1 && expectedResult2);
            assert.deepEqual(combinedResults, true);
        });
    });
    describe('002/overlay', function() {
        it(`Should pass if an edit with the composite keyname is passed to
            the function`, async function() {
            // Arrange
            const sinon = require('sinon');
            // ---- Amazon S3 stub
            const S3 = require('aws-sdk/clients/s3');
            const getObject = S3.prototype.getObject = sinon.stub();

            const blueRect = {
                create: {
                    width: 60,
                    height: 40,
                    channels: 4,
                    background: { r: 0, g: 0, b: 255, alpha: 0.5 }
                }
            };

            const greenRect = {
                create: {
                    width: 40,
                    height: 40,
                    channels: 4,
                    background: { r: 0, g: 255, b: 0, alpha: 0.5 }
                }
            };

            getObject.returns({
                promise: () => { return {
                    Body: greenRect
                }}
            })

            // Act
            const originalImage = blueRect;
            const edits = {
                composite: {
                    bucket: 'aaa',
                    key: 'bbb'
                }
            }
            // Assert
            const imageHandler = new ImageHandler();
            await imageHandler.applyEdits(originalImage, edits).then((result) => {
                // Come up with a suitable assert
            })
        });
    });
    describe('003/overlayResize', function() {
        it(`Should pass if an edit with the composite and resize keynames is passed to
            the function`, async function() {
            // Arrange
            const sinon = require('sinon');
            // ---- Amazon S3 stub
            const S3 = require('aws-sdk/clients/s3');
            const getObject = S3.prototype.getObject = sinon.stub();

            const blueRect = {
                create: {
                    width: 60,
                    height: 40,
                    channels: 4,
                    background: { r: 0, g: 0, b: 255, alpha: 0.5 }
                }
            };

            const greenRect = {
                create: {
                    width: 40,
                    height: 40,
                    channels: 4,
                    background: { r: 0, g: 255, b: 0, alpha: 0.5 }
                }
            };

            getObject.returns({
                promise: () => { return {
                    Body: greenRect
                }}
            })

            // Act
            const originalImage = blueRect;
            const edits = {
                resize: {
                    height: 300,
                    width: 300
                },
                composite: {
                    bucket: 'aaa',
                    key: 'bbb'
                }
            }
            // Assert
            const imageHandler = new ImageHandler();
            await imageHandler.applyEdits(originalImage, edits).then((result) => {
                // Come up with a suitable assert
            })
        });
    });
});

// ----------------------------------------------------------------------------
// [async] getOverlayImage()
// ----------------------------------------------------------------------------
describe('getOverlayImage()', function() {
    describe('001/validParameters', function() {
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
            const imageHandler = new ImageHandler();
            const result = await imageHandler.getOverlayImage('validBucket', 'validKey');
            // Assert
            assert.deepEqual(result, Buffer.from('SampleImageContent\n'));
        });
    });
    describe('002/imageDoesNotExist', async function() {
        it(`Should throw an error if an invalid bucket or key name is provided,
            simulating a non-existant overlay image`, async function() {
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
            const imageHandler = new ImageHandler();
            // Assert
            imageHandler.getOverlayImage('invalidBucket', 'invalidKey').then((result) => {
                assert.equal(typeof result, Error);
            }).catch((err) => {
                console.log(err)
            })
        });
    });
});