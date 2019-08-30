import React, { Component } from 'react';
import { Button, Input, Label, Image, Modal, Header, Icon, } from 'semantic-ui-react'
import './ChatRoom.css';

import user from './../MessageList/Message/images/avatar.png';

import { MessageList } from "./../MessageList/MessageList.js";
import { SystemTopicButton } from "./../MessageList/SystemButton/SystemTopicButton/SystemTopicButton.js";
import { SystemBotButton } from "./../MessageList/SystemButton/SystemBotButton/SystemBotButton.js";
import { SystemUserButton } from "./../MessageList/SystemButton/SystemUserButton/SystemUserButton.js";

const databaseURL = "https://bixby-rawdata.firebaseio.com/";

export class ChatRoom extends Component {
    id = 0;
    num_experiment = 1;
    curPath = '/topics/';
    after_require = false;

    constructor(props) {
        super(props);
        this.state = {
            // Tree Data
            topics: {},
            topicList: [],
            
            // Save the current statue of the tree
            curState: {},

            // Save the attributes for messageList
            time: new Date(),
            input: '',
            type: 'user',
            originResponse: '',
            messageList: [
                { id: 0, type: 'system', time: null, text: "Let's start " + 'conversation ' + this.num_experiment},
            ],

            // Data lists for conversation flow
            AnswerList: [],
            requirementList: [],
            otherResponseList: [],

            // Status for controlling chatflow
            inputButtonState: false,
            startSession: true,
            turnNotice: false,
            selectBotStatus: true,
            similarUserStatus: true,
            depth: 0,
        };
        
	    this._getTopics = this._getTopics.bind(this);
	    this._getRequirements = this._getRequirements.bind(this);
        this.scrollToBottom = this.scrollToBottom.bind(this);
        this.changeTurnNotice = this.changeTurnNotice.bind(this);
        this.resetMessageList = this.resetMessageList.bind(this);
        this.startConversation = this.startConversation.bind(this);
        this.updateRenderUntilSysBot = this.updateRenderUntilSysBot.bind(this);
        this.updateRenderUntilUserBot = this.updateRenderUntilUserBot.bind(this);
        this.selectTopic = this.selectTopic.bind(this);
        this.selectAnswer = this.selectAnswer.bind(this);
        this.similarResponse = this.similarResponse.bind(this);
        this.handleChangeText = this.handleChangeText.bind(this);
        this.handleCreate = this.handleCreate.bind(this);
        this.handleKeyPress = this.handleKeyPress.bind(this);
    }
    
    /* A. Lifecycle Function */

    componentDidMount() {
        this._getTopics();
    }
    
    componentDidUpdate(prevProps, prevState) {
        const { end, start, controlEndStatus, controlStartStatus, controlNextButtonStatus } = this.props;
        if ( end === true ) {
            this.setState({
                similarUserStatus: true,
                selectBotStatus: true,
                turnNotice: false,
            })
            controlEndStatus();
            controlNextButtonStatus();
        }

        if( start === true ) {
            this.startConversation();
            controlStartStatus();
        }
        this.scrollToBottom();
    }

    /* B. Data import  */
    //-----------------------
    // function for tree data import
    // ----------------------
    _getTopics() {
        fetch(`${databaseURL}/topics.json`).then(res => {
            if(res.status !== 200) {
                throw new Error(res.statusText);
            }
            return res.json();
        }).then(topics => this.setState({topics: topics}));
    }

    _getRequirements(path) {
        fetch(`${databaseURL+path}`).then(res => {
            if(res.status !== 200) {
                throw new Error(res.statusText);
            }
            return res.json();
        }).then(requirementList => {
            this.setState({
                requirementList: requirementList,
            })
        });
    }

    /* C. Controlling Functions */

    // Auto scrolling to bottom
    scrollToBottom = () => {
        this.messagesEnd.scrollIntoView({ behavior: "smooth" });
    }

    // Notice the turn of user to user
    changeTurnNotice = () => {
        const { blockEndButtonStatus, unblockEndButtonStatus } = this.props;
        blockEndButtonStatus();
        setTimeout(() => {
            this.setState(prevState => ({
                turnNotice: !prevState.turnNotice,
                inputButtonState: true,
            }));
            unblockEndButtonStatus();
        }, 900);
    }

    // Reset the messageList when the conversation is ended
    resetMessageList = () => {
        this.setState({
            messageList: [
                { id: 0, type: 'system', time: null, text: 'End the '+ 'conversation ' + this.num_experiment},
                { id: 1, type: 'system', time: null, text: 'Click the [Next Conversation] Button in below'}
            ],
        })
        this.id = 0
    }

    // Initialize the messageList when a new conversation starts
    startConversation = () => {
        this.num_experiment ++;
        this._getTopics();
        this.curPath = '/topics/';
        this.id = 0
        this.setState({
            messageList: [
                { id: 0, type: 'system', time: null, text: 'Lets start ' + 'conversation ' + + this.num_experiment}
            ],
            startSession: true,
            curState: {},
            num_requirement: -1,
        })
    }

    // Set interval btw user response and SystemBotButton
    // For preventing the message ordering, block the endbutton during 1000ms through 'controlEndButtonStatus'
    updateRenderUntilSysBot(){
        const { blockEndButtonStatus, unblockEndButtonStatus } = this.props;
        blockEndButtonStatus();
        setTimeout(() => {
            this.setState(prevState => ({
                selectBotStatus: !prevState.selectBotStatus
            }));
            unblockEndButtonStatus();
        }, 1000);
    }

    // Set interval btw user response and SystemUserButton
    // For preventing the message ordering, block the endbutton during 1000ms through 'controlEndButtonStatus' function
    updateRenderUntilUserBot(){
        const { blockEndButtonStatus, unblockEndButtonStatus } = this.props;
        blockEndButtonStatus();
        setTimeout(() => {
            this.setOtherResponseList();
            this.setState(prevState => ({
                similarUserStatus: !prevState.similarUserStatus,
            }));
            unblockEndButtonStatus();
        }, 1000);
    }

    // Putting topic from the SystemTopicButton
    // And start the conversation with user's utterance (selected Topic)
    // Also unblock the endbutton through 'controlEndButtonStatus' function
    selectTopic = (dataFromChild, id) => {
        const { messageList, time } = this.state;
        const { topicConvey, controlEndButtonStatus } = this.props;
        controlEndButtonStatus();
        topicConvey(this.curPath + id + '/requirementList.json')
        this._getRequirements(this.curPath + id + '/requirementList.json');
        this.setState({
            startSession: false,
            messageList: messageList.concat({
                id: this.id++,
                type: 'user',
                time: time.toLocaleTimeString(),
                text: dataFromChild.value,
                tag: dataFromChild.tag,
            }),
        })
        this.curPath = this.curPath + id + '/children';
	    this.setAnswerList(dataFromChild.children);
        this.updateRenderUntilSysBot();
    }

    setOtherResponseList = () => {
        const { curState } = this.state;
        if(curState !== null && curState !== undefined){
            this.setState({
                otherResponseList: curState,
            });
        } else {
            this.setState({
                otherResponseList: [],
            })
        }
    }

    setAnswerList = (children) => {
        if(children !== null && children !== undefined) {
            this.setState({
                AnswerList: children,
            });
        } else {
            this.setState({
                AnswerList: [],
            })
        }
    }

    // Putting selected answer from the SystemBotButton
    selectAnswer = (dataFromChild, addedPath, newAnswerState) => {
        const { messageList, time, } = this.state;

        if(newAnswerState === true) {
            this.setState({
                messageList: messageList.concat({
                    id: this.id++,
                    type: 'bot',
                    time: time.toLocaleDateString(),
                    text: dataFromChild.value,
                    tag: dataFromChild.tag,
                    path: this.curPath + '/' + addedPath
                }),
                selectBotStatus: true,
                curState: null,
            })
        } else{
            this.setState({
                messageList: messageList.concat({
                    id: this.id++,
                    type: 'bot',
                    time: time.toLocaleDateString(),
                    text: dataFromChild.value,
                    tag: dataFromChild.tag,
                    path: this.curPath + '/' + addedPath
                }),
                selectBotStatus: true,
                curState: dataFromChild.children,
            })
        }

        this.curPath = this.curPath + '/' + addedPath + '/children';
        this.changeTurnNotice();
    }

    // Putting similar response which user is selected from the SystemUserButton
    similarResponse = (dataFromChild, addedPath) => {
        const { messageList, time, } = this.state;
        
        // 나중에 수정으로 대체
        this.setState({
            messageList: this.state.messageList.splice(-1, 1)
        })

        this.setState({
            messageList: messageList.concat({
                id: this.id++,
                type: 'user',
                time: time.toLocaleDateString(),
                text: dataFromChild.value,
                tag: dataFromChild.tag,
                path: this.curPath + '/' + addedPath,
            }),
            similarUserStatus: true,
        })

        this.curPath = this.curPath + '/' + addedPath + '/children';
        this.setAnswerList(dataFromChild.children);
        this.updateRenderUntilSysBot();
    }

    /* D. Event Handler */

    // save the input text of each utterance
    handleChangeText = (e) => {
        this.setState({
            input: e.target.value
        });
    }

    // add the input utterance with text, time, type to messageList 
    handleCreate = () => {
        const { input, type, time, messageList } = this.state;
        this.setState({
            input: '',
            turnNotice: false,
            originResponse: input,
            inputButtonState: false,
            messageList: messageList.concat({
                id: this.id++,
                type: type,
                time: time.toLocaleTimeString(),
                text: input,
            }),
        })
        this.updateRenderUntilUserBot();
        this.scrollToBottom();
    }

    handleKeyPress = (e) => {
        if(e.key === 'Enter') {
            this.handleCreate();
        }
    }

    render() {
        const { input, time, originResponse, 
            topics, messageList, AnswerList, requirementList,
            otherResponseList, inputButtonState, 
            turnNotice, startSession, selectBotStatus,
            similarUserStatus } = this.state;
        const {
            handleChangeText,
            handleCreate,
            handleKeyPress,
            selectTopic,
            selectAnswer,
            similarResponse,
        } = this;

        const sysNotice = [
            { id: 0, type: 'system', time: null, text: "Now, it's User turn!\n\nPlease enter your response as a user in the input field at the bottom of the page."},
            { id: 2, type: 'loading', time: null, text: "  "},
        ];

        return (
                <div class="chatOuterBox">
                    <div class="chatInnerBox">
                        <main class="chatRoom">
                            <div class="dateSection">
                                <span>{time.toLocaleTimeString()}</span>
                            </div>
                            <div>
                                <MessageList messageList={messageList}/>
                                {startSession ? <SystemTopicButton topics={topics} selectTopic={selectTopic}/> : null}
                                {similarUserStatus ? null : <SystemUserButton 
                                                                similarResponse={similarResponse}
                                                                originResponse={originResponse}
                                                                otherResponseList={otherResponseList}
                                                                curPath={this.curPath}
                                                            />}
                                {selectBotStatus ? null : <SystemBotButton 
                                                            selectAnswer={selectAnswer}
                                                            AnswerList={AnswerList}
                                                            curPath={this.curPath}
                                                            requirementList={requirementList}
                                                            />}
                                {turnNotice ? <MessageList messageList={sysNotice}/> : null}
                            </div>
                            <div style={{float:'left', clear:'both', height:'150px'}} ref={(el) => { this.messagesEnd = el; }}></div>
                        </main>
                        <div class="textInputBox">
                            <div class="textInputBoxInput">
                                {inputButtonState
                                    ?   <Input fluid type='text' placeholder='Type...' action>
                                            <Label color={'violet'}>
                                                <Image avatar spaced='right' src={user} />
                                                User
                                            </Label>
                                            <input style={{marginLeft:'3px'}} value={input} onChange={handleChangeText} onKeyPress={handleKeyPress}/>
                                            <Button type='submit' onClick={handleCreate}>Send</Button>
                                        </Input>
                                    :   <Input fluid disabled type='text' placeholder='Type...' action>
                                            <input value={input} onChange={handleChangeText} onKeyPress={handleKeyPress}/>
                                            <Button type='submit' onClick={handleCreate}>Send</Button>
                                        </Input>
                                }
                            </div>
                        </div>
                    </div>
                </div>
        );
    }
}
