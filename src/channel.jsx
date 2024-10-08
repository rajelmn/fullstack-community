import Header from "./components/header";
import SideBar from "./components/sideBar";
import App from "./App";
import "./App.css";
import { useEffect, useRef, useState } from "react";
import {  useNavigate,useParams } from "react-router-dom";
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';
import { io } from "socket.io-client";
import { FaUpload } from "react-icons/fa6";
import { FaReply } from "react-icons/fa";
import { CiCircleRemove } from "react-icons/ci";
import { LineMessage, RegularMessage, LatexMessage } from "./components/messages";
import DynamicDate from "./components/DynamicDate";
import { MdDelete,MdModeEdit,MdOutlineAddReaction,MdVerified } from "react-icons/md";
import { IoMdSend } from "react-icons/io";
const socket = io("/", {
  transports: ["websocket"],
  path: "/socket.io",
});
export default function Channel() {
  const [messages, setMessages] = useState([]);
  const [channels , setChannels] = useState([]);
  const [typingUser, setTypingUser] = useState([]);
  const [userAnswering, setUserAnswering] = useState({});
  const [userData, setUserData] = useState({});
  const Navigate = useNavigate();
  const elem = useRef(null);
  const { id } = useParams();
  console.log(messages)
  const input = useRef(null);

  async function storeMessagesInDb(message, date, file, messageId, isLatex) {
  const user = JSON.stringify({
  message,
  name: userData.name,
  url: userData.url,
  userName: userData.userName,
  answering: {
    isAnswering: userAnswering.messageId ? true: false,
    name: userData.name,
    url: userData.url,
    message: userAnswering?.message,
    messageId: userAnswering?.messageId,
  },
  date,
  id,
  messageId,
  isLatex
});
    const formData = new FormData();
    formData.append('user', user);
    formData.append('file',file )
    try {
       const response = await fetch("/storemessage", {
        method: "post",
        body: formData,
      });
      const image = await response.json();
      return image
    } catch (err) {
      console.error(err);
    }
  }

  async function handleDeleteMessage(messageId) {
    try {
      const deletedMessage = messages.filter((message) => message.messageId === messageId);
      socket.emit('delete',deletedMessage, id);
    } catch(err){
      console.log(err)
    }
  }

  function handleEdit(id) {
    const editedMessage = messages.filter(item => item.messageId === id);
    if(editedMessage.isEdit) {
      setMessages(prev => [
        ...prev.map(item => {
          if(item.messageId === id) {
            return {...item, isEdit: false}
          }
          return item
        })
      ])
    }
    setMessages(prev => [
      ...prev.map(item => {
        if(item.messageId === id) {
          return {...item, isEdit: true}
        }
        return item
      })
    ])
  }

  function handleAnsweringMessage(messageObj) {
    const {messageId, name, message, url} = messageObj;
    setUserAnswering({messageId, name, message, url})
  }

  function handleSubmitEdit(newMsg,messageId) {
    try {
      console.log('sumbitting')
      socket.emit('edit',newMsg, messageId, id)
    } catch(err) {
      console.log(err)
    }
  }
  function handleInputChange(e) {
    socket.emit('change', userData.name, id)
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if(!e.target.text.value.length) return;
    let image;
    let file = e.target.image.files[0];
    const date = new Date();
    const isLatex = e.target.text.value.match(/[$]/gi)?.length === 2
    const messageId = crypto.randomUUID();
    if(file) {
      image = await storeMessagesInDb(e.target.text.value, date , file, isLatex);
    }
    else {
      storeMessagesInDb(e.target.text.value, date,undefined, messageId, isLatex)
    }

    socket.emit("message", {
      isLatex,
      message: e.target.text.value,
      name: userData.name,
      userName: userData.userName,
      url: userData.url,
      answering: {
        isAnswering: userAnswering.messageId ? true: false,
        name: userAnswering?.name,
        url: userAnswering?.url,
        message: userAnswering?.message,
        messageId: userAnswering?.messageId,
      } ,
      date,
      image,
      messageId,
    },  id);
    setUserAnswering({});
    input.current.value = "";
    e.target.image.value = '';
  }

  useEffect(() => {
    socket.emit('join',  id)
    async function loadMessagesFromDb() {
      const messages = await fetch("/getdata", {
        method: "post",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({  id }),
      })
        .then((res) => res.json())
        .catch((err) => console.error(err));
      setMessages(messages);
    }

    function onConnection() {
      console.log("connection");
      socket.on('error', () => {
        Navigate('/')
      })
      socket.on('channels', (channelDetail) => {
        console.log('on channels')
        setChannels(prev => [
          ...prev,
          channelDetail
        ])
      })
      socket.on("chat", (msg) => {
        setMessages((prev) => [...prev, msg]);
      });
      socket.on('delete', (msg) => {
       
        setMessages((prevMessages) => {
          return prevMessages.filter((message) => message.messageId !== msg[0].messageId);
        });
      });
      socket.on('edit', (newMsg, oldMessageId) => {
        setMessages(prev => [
          ...prev.map(item => {
            if(item.messageId === oldMessageId) {
              return {...item, message:newMsg, isEdit: false};
            }
            return item;
          })
        ])
      })

      socket.on('change', (name) => {
        setTypingUser(prev => {
          if(prev.includes(name)) {
            setTimeout(() => {
              setTypingUser(prev => prev.filter(item => item !== name))
            }, 3000);
            return prev
          }else {
            return [...prev, name]
          }
        })
       
      })
    }

    loadMessagesFromDb();
    socket.connect();
    socket.on("connect", onConnection);
    return () => {
      socket.off("connect", onConnection);
      socket.off("chat");
      socket.off('delete'); 
      socket.disconnect();
    };
  }, [id]);

  useEffect(() => {
    async function getUserData() {
      try {
        const res = await fetch('/userData');
        if(!res.ok) throw new Error('couldnt get userData');
        const userData = await res.json();
        setUserData(userData);
      } catch(err) {
        console.log(err)
        Navigate('/register')
      }
  }
    getUserData();
  }, [])


  return (
    <div className="flex bg-background h-screen ">
      <div className=" flex w-full flex-col ">
        <div
          ref={elem}
          className="messages w-full overflow-y-auto h-[calc(100vh-(55px+100px))] bg-black pb-5"
        >
          {messages &&
            messages.map((message, index) => (
              
              <>
                {(!message.isLatex && !message?.answering?.isAnswering && index > 0 && messages[index - 1].name) ===
                  messages[index].name  ? (
                    // message, messages, handleSubmitEdit, userData 
                 <LineMessage
                 message={message}
                 handleEdit={handleEdit}
                 handleAnsweringMessage={handleAnsweringMessage}
                 handleDeleteMessage={handleDeleteMessage}
                 messages={messages}
                 handleSubmitEdit={handleSubmitEdit}
                 userData={userData}
                 index={index}
                 />
                ) : message.isLatex ? (
                  <>
                  <Answer message={message} messages={messages} />
                  <LatexMessage 
                  message={message}
                  messages={messages}
                  userData={userData}
                  index={index}
                  handleAnsweringMessage={handleAnsweringMessage}
                  handleDeleteMessage={handleDeleteMessage}
                  handleSubmitEdit={handleSubmitEdit}
                  handleEdit={handleEdit}
                  />
                  </>
                ) : (
                  
                  <>
                  
                  <Answer message={message} messages={messages} />
                  <RegularMessage 
                  message={message}
                  messages={messages}
                  userData={userData}
                  index={index}
                  handleAnsweringMessage={handleAnsweringMessage}
                  handleDeleteMessage={handleDeleteMessage}
                  handleSubmitEdit={handleSubmitEdit}
                  handleEdit={handleEdit}
                  />
                  </>
                )}
              </>
            ))}
        </div>
        <MessageInput 
        userAnswering={userAnswering}
        handleInputChange={handleInputChange}
        handleSubmit={handleSubmit}
        input={input}
        setUserAnswering={setUserAnswering}
        typingUser={typingUser}
        userData={userData}
        />
      </div>
    </div>
  );
}  

export function Answer({message, messages}) {

  return(
    <>
    {message.answering?.isAnswering && (
      <div className="flex items-center pl-[73px] my-3 border-solid border border-[#665656]">
        {console.log(message.answering, 'answering')}
      <img src={messages.filter(item => item.messageId === message.answering?.messageId)[0]?.url} className="rounded-[50%] w-7 h-7" alt="" />
      <span className=" text-gray-500">{messages.filter(item => item.messageId === message.answering?.messageId)[0]?.name}</span>
    <p className="ml-1 break-all text-xs text-white">
      
      {messages.filter(item => item.messageId === message.answering?.messageId)[0]?.message}
    </p>
  </div>
    )}
    </>
  )
}

export function MessageInput({ userAnswering, handleSubmit, input, handleInputChange, setUserAnswering, typingUser,userData }) {
  
  return(
    <div className="form-test w-full bg-background remove-padding p-4">
          {userAnswering.messageId && (
          <div className="answer bg-slate-800 text-white p-1 flex justify-between">
          <p>replying to {userAnswering.name}</p>
          <CiCircleRemove className="text-3xl cursor-pointer" onClick={() => setUserAnswering({})} />
          </div>
          )}  
          <form
            onSubmit={handleSubmit}
            className="flex w-full items-center justify-between bg-gray-700 "
          >
            <div className="upload-image pl-4">
              <label htmlFor="upload-file">
                <FaUpload className="text-white text-2xl" />
              </label>
              <input
                type="file"
                id="upload-file"
                className="hidden"
                name="image"
              />
            </div>
            <input
              type="text"
              name="text"
              ref={input}
              placeholder="write message"
              onChange={handleInputChange}
              className="outline-none bg-gray-700 text-white transparent w-[90%] py-2 rounded-l-md"
            />
            <button type="submit">
              <IoMdSend className="text-white cursor-pointer text-2xl" />
            </button>
          </form>
          {typingUser.length >= 1 ? (
            <p className="text-white">
              {typingUser
                .filter(user => user !== userData.name)
                .reduce(
                  (accmulator, previous) => previous + " and " + accmulator , ''
                )}{" "}
                {typingUser[0] !== userData.name && <> is typing..</>}
            </p>
          ) : (
            <></>
          )}
        </div>
  )
}

// function ListMessages({children}) {

//   return(
//     {children}
//   )
// }