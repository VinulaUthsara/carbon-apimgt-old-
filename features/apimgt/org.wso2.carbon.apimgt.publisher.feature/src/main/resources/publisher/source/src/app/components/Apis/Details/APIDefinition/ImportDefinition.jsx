/*
 * Copyright (c) 2019, WSO2 Inc. (http://www.wso2.org) All Rights Reserved.
 *
 * WSO2 Inc. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import React, {useReducer} from 'react';
import {makeStyles} from '@material-ui/core/styles';
import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import {FormattedMessage, useIntl} from 'react-intl';
import {Typography} from "@material-ui/core";
import ProvideOpenAPI from "../../Create/OpenAPI/Steps/ProvideOpenAPI";
import CloudUploadRounded from '@material-ui/icons/CloudUploadRounded';
import ProvideGraphQL from "../../Create/GraphQL/Steps/ProvideGraphQL";
import Alert from 'AppComponents/Shared/Alert';
import API from 'AppData/api.js';
import {isRestricted} from 'AppData/AuthManager';
import {useAPI} from 'AppComponents/Apis/Details/components/ApiContext';

const useStyles = makeStyles(theme => ({
    importDefinitionDialogHeader: {
        fontWeight: '600',
    },
    buttonIcon: {
        marginRight: 10,
    },
}));

export default function ImportDefinition() {
    const classes = useStyles();
    const [openAPIDefinitionImport, setOpenAPIDefinitionImport] = React.useState(false);
    const [api] = useAPI();
    const intl = useIntl();
    const isGraphQL = api.isGraphql();

    const handleAPIDefinitionImportOpen = () => {
        setOpenAPIDefinitionImport(true);
    };

    const handleAPIDefinitionImportCancel = () => {
        setOpenAPIDefinitionImport(false);
    };

    function apiInputsReducer(currentState, inputAction) {
        const {action, value} = inputAction;
        switch (action) {
            case 'type':
            case 'inputValue':
            case 'name':
            case 'version':
            case 'endpoint':
            case 'context':
            case 'policies':
            case 'isFormValid':
                return {...currentState, [action]: value};
            case 'inputType':
                return {...currentState, [action]: value, inputValue: value === 'url' ? '' : null};
            case 'preSetAPI':
                return {
                    ...currentState,
                    name: value.name.replace(/[&/\\#,+()$~%.'":*?<>{}\s]/g, ''),
                    version: value.version,
                    context: value.context,
                };
            default:
                return currentState;
        }
    }

    const [apiInputs, inputsDispatcher] = useReducer(apiInputsReducer, {
        type: 'ImportDefinition',
        inputType: 'url',
        inputValue: '',
        formValidity: false,
    });

    /**
     * Handles definition input change
     * @param event
     */
    function handleOnChange(event) {
        const {name: action, value} = event.target;
        inputsDispatcher({action, value});
    }

    /**
     * Handles API definition import
     */
    function importDefinition() {
        if (isGraphQL) {
            updateGraphQLSchema();
        } else {
            updateOASDefinition();
        }
    }

    /**
     * Updates OpenAPI definition
     */
    function updateOASDefinition() {
        const {
            inputValue, inputType,
        } = apiInputs;

        const newAPI = new API();
        const promisedResponse =
            inputType === 'file' ? newAPI.updateAPIDefinitionByFile(api.id, inputValue) :
                newAPI.updateAPIDefinitionByUrl(api.id, inputValue);
        promisedResponse
            .then((api) => {
                Alert.success(intl.formatMessage({
                    id: 'Apis.Details.APIDefinition.APIDefinition.api.definition.updated.successfully',
                    defaultMessage: 'API Definition Updated Successfully',
                }));

            })
            .catch((error) => {
                console.error(error);
                Alert.error(intl.formatMessage({
                    id: 'Apis.Details.APIDefinition.APIDefinition.error.while.updating.api.definition',
                    defaultMessage: 'Error while updating the API Definition',
                }));
            });

    }

    /**
     * Updates GraphQL schema definition
     */
    function updateGraphQLSchema() {
        const {
            inputValue,
        } = apiInputs;

        const promisedValidation = API.validateGraphQLFile(inputValue);
        promisedValidation
            .then((response) => {
                const {isValid, graphQLInfo} = response.obj;
                if (isValid === true) {
                    api.operations = graphQLInfo.operations;
                    updateGraphQLAPIDefinition(api, graphQLInfo.graphQLSchema.schemaDefinition);
                }
            })
            .catch((err) => {
                console.log(err);
                Alert.error(intl.formatMessage({
                    id: 'Error.while.validating.the.imported.graphQLSchema',
                    defaultMessage: 'Error while validating imported schema',
                }));
            });
    }

    /**
     * Update the graphQL api with its operation
     * @param {*}  api
     * @param {*}  graphQLInfo
     */
    function updateGraphQLAPIDefinition(api, graphQLSchema) {
        const promisedAPI = api.updateGraphQLAPIDefinition(api.id, graphQLSchema);
        promisedAPI
            .then((response) => {
                Alert.success(intl.formatMessage({
                    id: 'Apis.Details.APIDefinition.APIDefinition.graphQLDefinition.updated.successfully',
                    defaultMessage: 'Schema Definition Updated Successfully',
                }));
            })
            .catch((err) => {
                console.log(err);
                Alert.error(intl.formatMessage({
                    id: 'Apis.Details.APIDefinition.APIDefinition.error.updating.graphQL.schema',
                    defaultMessage: 'Error while updating graphQL schema',
                }));
            });
    }

    /**
     *
     * Set the validity of the API definition imports
     * @param {*} isValidForm
     * @param {*} validationState
     */
    function handleOnValidate(isFormValid) {
        inputsDispatcher({
            action: 'isFormValid',
            value: isFormValid,
        });
    }

    return (
        <React.Fragment>
            <Button
                size='small'
                className={classes.button}
                onClick={handleAPIDefinitionImportOpen}
                disabled={isRestricted(['apim:api_create'], api)}
            >
                <CloudUploadRounded className={classes.buttonIcon}/>
                <FormattedMessage
                    id='Apis.Details.APIDefinition.APIDefinition.import.definition'
                    defaultMessage='Import Definition'
                />
            </Button>
            <Dialog open={openAPIDefinitionImport}>
                <DialogTitle>
                    <Typography className={classes.importDefinitionDialogHeader}>
                        {isGraphQL ? (
                            <FormattedMessage
                                id='Apis.Details.APIDefinition.APIDefinition.import.definition.graphql'
                                defaultMessage='Import GraphQL Schema Definition'
                            />) : (
                            <FormattedMessage
                                id='Apis.Details.APIDefinition.APIDefinition.import.definition.oas'
                                defaultMessage='Import OpenAPI Definition'
                            />
                        )}
                    </Typography>
                </DialogTitle>
                <DialogContent>
                    {isGraphQL ? (
                        <ProvideGraphQL
                            onValidate={handleOnValidate}
                            apiInputs={apiInputs}
                            inputsDispatcher={inputsDispatcher}
                        />
                    ) : (

                        <ProvideOpenAPI
                            onValidate={handleOnValidate}
                            apiInputs={apiInputs}
                            inputsDispatcher={inputsDispatcher}
                        />
                    )}

                </DialogContent>
                <DialogActions>
                    <Button onClick={handleAPIDefinitionImportCancel}>
                        <FormattedMessage
                            id='Apis.Details.APIDefinition.APIDefinition.import.definition.cancel'
                            defaultMessage='Cancel'
                        />
                    </Button>
                    <Button
                        onClick={importDefinition}
                        variant='contained'
                        color='primary'
                        disabled={!apiInputs.isFormValid}
                    >
                        <FormattedMessage
                            id='Apis.Details.APIDefinition.APIDefinition.import.definition.import'
                            defaultMessage='Import'
                        />
                    </Button>
                </DialogActions>
            </Dialog>
        </React.Fragment>
    );
}
