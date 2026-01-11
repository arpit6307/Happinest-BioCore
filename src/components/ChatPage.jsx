import React, { useState, useEffect, useRef } from 'react';
import { Form, Button, Badge, Spinner, Modal, Offcanvas, Image } from 'react-bootstrap';
import { 
  FiSend, FiMessageSquare, FiImage, FiCheck, 
  FiCheckCircle, FiX, FiFileText, FiDownload, FiTrash2, 
  FiChevronLeft, FiSearch, FiMoreVertical, FiMail, FiMapPin, FiShield, FiBriefcase, FiPhone, FiInfo, FiUser
} from "react-icons/fi";
import { 
  collection, query, where, onSnapshot, addDoc, serverTimestamp, 
  doc, setDoc, orderBy, writeBatch, getDocs 
} from 'firebase/firestore';
import { db } from '../firebase';
import { format, isToday, isYesterday } from 'date-fns';

const ChatPage = ({ currentUser, userRole, userData }) => {
  if (!currentUser) return (
    <div className="d-flex justify-content-center align-items-center vh-100 bg-light flex-column">
      <Spinner animation="border" variant="primary" />
      <p className="mt-3 text-muted fw-bold">Connecting to Secure Chat...</p>
    </div>
  );

  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messageText, setMessageText] = useState("");
  const [messages, setMessages] = useState([]);
  const [chatId, setChatId] = useState(null);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [unreadCounts, setUnreadCounts] = useState({}); 
  const [searchTerm, setSearchTerm] = useState("");
  const [showProfileInfo, setShowProfileInfo] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // File Sharing
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [fileType, setFileType] = useState(null);
  const [sendingFile, setSendingFile] = useState(false);

  // Typing Status
  const [isTyping, setIsTyping] = useState(false);
  const [remoteTyping, setRemoteTyping] = useState(false);

  const scrollRef = useRef(); 
  const fileInputRef = useRef();
  const typingTimeoutRef = useRef(null);

  const CLOUD_NAME = "dm2yxz4g8"; 
  const UPLOAD_PRESET = "happinest_preset"; 

  // --- 1. FETCH USERS ---
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "users"), (snapshot) => {
      let usersList = [];
      snapshot.forEach((docSnap) => {
        if (docSnap.id !== currentUser.uid) {
          usersList.push({ id: docSnap.id, ...docSnap.data() });
          setupUnreadListener(docSnap.id);
        }
      });
      setUsers(usersList);
      setLoadingUsers(false);
    });
    return () => unsubscribe();
  }, [currentUser.uid]);

  const setupUnreadListener = (otherUserId) => {
    const combinedId = currentUser.uid > otherUserId 
      ? `${currentUser.uid}_${otherUserId}` 
      : `${otherUserId}_${currentUser.uid}`;
    
    const q = query(
      collection(db, "chats", combinedId, "messages"),
      where("senderId", "==", otherUserId),
      where("read", "==", false)
    );

    onSnapshot(q, (snap) => {
      setUnreadCounts(prev => ({ ...prev, [otherUserId]: snap.size }));
    });
  };

  // --- 2. SETUP CHAT ID ---
  useEffect(() => {
    if (selectedUser) {
      const id = currentUser.uid > selectedUser.id 
        ? `${currentUser.uid}_${selectedUser.id}` 
        : `${selectedUser.id}_${currentUser.uid}`;
      setChatId(id);
      setShowProfileInfo(false); // Close profile if switching user
    } else {
      setChatId(null);
    }
  }, [selectedUser, currentUser.uid]);

  // --- 3. LIVE MESSAGES ---
  useEffect(() => {
    if (!chatId) return;
    
    const msgsRef = collection(db, "chats", chatId, "messages");
    const q = query(msgsRef, orderBy("timestamp", "asc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let msgs = [];
      let unreadBatch = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        msgs.push({ id: docSnap.id, ...data });
        if (data.senderId !== currentUser.uid && !data.read) {
          unreadBatch.push(docSnap.id);
        }
      });
      setMessages(msgs);

      if (unreadBatch.length > 0) {
        const batch = writeBatch(db);
        unreadBatch.forEach(mId => {
          batch.update(doc(db, "chats", chatId, "messages", mId), { read: true });
        });
        batch.commit();
      }
      setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    });

    const unsubTyping = onSnapshot(doc(db, "chats", chatId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const typingData = data.typingStatus || {};
        setRemoteTyping(typingData[selectedUser?.id] === true);
      } else {
        setRemoteTyping(false);
      }
    });

    return () => { unsubscribe(); unsubTyping(); };
  }, [chatId, currentUser.uid, selectedUser?.id]);

  // --- 4. HANDLERS ---
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      const isImg = file.type.startsWith('image/');
      setFileType(isImg ? 'image' : 'document');
      setPreviewUrl(isImg ? URL.createObjectURL(file) : null);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if ((!messageText.trim() && !selectedFile) || !chatId) return;
    
    const textToSend = messageText;
    const fileToSend = selectedFile;
    const typeToSend = fileType;

    setMessageText(""); setSelectedFile(null); setPreviewUrl(null); setIsTyping(false);

    try {
      await setDoc(doc(db, "chats", chatId), { typingStatus: { [currentUser.uid]: false } }, { merge: true });
      
      let finalFileUrl = null;
      if (fileToSend) {
        setSendingFile(true);
        const data = new FormData();
        data.append("file", fileToSend);
        data.append("upload_preset", UPLOAD_PRESET);
        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`, { method: "POST", body: data });
        const cloudData = await res.json();
        finalFileUrl = cloudData.secure_url;
        setSendingFile(false);
      }

      const messageContent = finalFileUrl ? (typeToSend === 'image' ? "📷 Image Sent" : "📄 Document Sent") : textToSend;

      await setDoc(doc(db, "chats", chatId), {
        participants: [currentUser.uid, selectedUser.id],
        lastMessage: { 
          text: messageContent, 
          senderId: currentUser.uid, 
          timestamp: serverTimestamp(),
          read: false
        },
        updatedAt: serverTimestamp()
      }, { merge: true });

      await addDoc(collection(db, "chats", chatId, "messages"), {
        text: textToSend,
        senderId: currentUser.uid,
        timestamp: serverTimestamp(),
        read: false,
        ...(finalFileUrl && { fileUrl: finalFileUrl, fileCategory: typeToSend, fileName: fileToSend.name })
      });

      // Notification logic
      await addDoc(collection(db, "notifications"), {
        title: `New Message from ${userData?.name || 'Colleague'}`,
        message: messageContent.length > 30 ? messageContent.substring(0, 30) + "..." : messageContent,
        type: "info",
        timestamp: serverTimestamp(),
        read: false, 
        seen: false, 
        targetUserId: selectedUser.id,
        senderId: currentUser.uid,
        branch: userData?.branch || 'General'
      });

    } catch (err) { console.error("Message Send Error:", err); setSendingFile(false); }
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setMessageText(val);
    if (!chatId) return;

    const updateTypingStatus = async (status) => {
      await setDoc(doc(db, "chats", chatId), { typingStatus: { [currentUser.uid]: status } }, { merge: true });
    };

    if (!isTyping && val.trim().length > 0) {
      setIsTyping(true);
      updateTypingStatus(true);
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      updateTypingStatus(false);
    }, 2000);
  };

  const handleClearChat = async () => {
    if (!chatId || userRole !== 'Admin') return;
    setIsDeleting(true);
    try {
      const msgsRef = collection(db, "chats", chatId, "messages");
      const snapshot = await getDocs(msgsRef);
      const batch = writeBatch(db);
      snapshot.docs.forEach((docSnap) => batch.delete(docSnap.ref));
      await batch.commit();
      await setDoc(doc(db, "chats", chatId), {
        lastMessage: { text: "Chat cleared by Admin", timestamp: serverTimestamp() }
      }, { merge: true });
      setShowDeleteModal(false);
    } catch (err) { console.error(err); }
    setIsDeleting(false);
  };

  const downloadFile = (url) => window.open(url, '_blank');
  const filteredUsers = users.filter(u => u.name?.toLowerCase().includes(searchTerm.toLowerCase()));

  // Helper for Date Grouping
  const renderDateSeparator = (date) => {
      let label = format(date, 'MMMM dd, yyyy');
      if (isToday(date)) label = 'Today';
      if (isYesterday(date)) label = 'Yesterday';
      return (
          <div className="d-flex justify-content-center my-3">
              <span className="badge bg-light text-muted border px-3 py-1 rounded-pill fw-normal shadow-sm" style={{fontSize: '0.75rem'}}>
                  {label}
              </span>
          </div>
      );
  };

  return (
    <div className="chat-wrapper d-flex flex-column" style={{ height: 'calc(100vh - 120px)', animation: 'fadeIn 0.4s ease-in-out' }}>
      
      <div className="flex-grow-1 d-flex bg-white rounded-4 shadow-sm overflow-hidden border glass-shell position-relative">
        
        {/* ================= LEFT SIDEBAR (USER LIST) ================= */}
        <div 
            className={`d-flex flex-column border-end bg-white h-100 ${selectedUser ? 'd-none d-md-flex' : 'd-flex'}`} 
            style={{ width: window.innerWidth < 768 ? '100%' : '350px', minWidth: '300px', transition: 'width 0.3s' }}
        >
          {/* Search Header */}
          <div className="p-3 border-bottom sticky-top bg-white z-1">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="fw-800 m-0 text-dark d-flex align-items-center"><FiMessageSquare className="me-2 text-primary"/> Team Chat</h5>
            </div>
            <div className="search-box position-relative">
              <FiSearch className="position-absolute text-muted" style={{ left: '15px', top: '12px' }} />
              <Form.Control 
                className="rounded-pill border-0 bg-light ps-5 py-2 no-focus shadow-none" 
                placeholder="Search colleagues..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ fontSize: '0.9rem' }}
              />
            </div>
          </div>

          {/* User List */}
          <div className="flex-grow-1 overflow-auto custom-scrollbar p-2">
            {loadingUsers ? (
              <div className="text-center mt-5"><Spinner animation="border" variant="primary" size="sm" /></div>
            ) : (
              filteredUsers.map(u => (
                <div 
                  key={u.id} 
                  onClick={() => setSelectedUser(u)}
                  className={`user-item d-flex align-items-center p-3 mb-1 rounded-4 cursor-pointer transition-all ${selectedUser?.id === u.id ? 'active-user shadow-sm' : 'hover-bg-light'}`}
                >
                  <div className="position-relative flex-shrink-0">
                    {u.photoURL ? (
                      <img src={u.photoURL} alt="" className="avatar shadow-sm border" />
                    ) : (
                      <div className="avatar-initials bg-gradient-primary text-white shadow-sm">{u.name?.charAt(0).toUpperCase()}</div>
                    )}
                    {/* Online Dot (Simulated) */}
                    <div className="status-indicator online shadow-sm"></div>
                  </div>
                  <div className="ms-3 overflow-hidden flex-grow-1">
                    <div className="d-flex justify-content-between align-items-center">
                        <span className={`fw-bold text-truncate name-label ${selectedUser?.id === u.id ? 'text-primary' : 'text-dark'}`}>{u.name}</span>
                        {unreadCounts[u.id] > 0 && <Badge pill bg="danger" className="shadow-sm small-badge">{unreadCounts[u.id]}</Badge>}
                    </div>
                    <div className="d-flex justify-content-between align-items-center mt-1">
                        <small className="text-muted d-block text-truncate role-label" style={{fontSize: '0.75rem', maxWidth:'140px'}}>{u.role || 'Member'} • {u.branch || 'HO'}</small>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ================= RIGHT CHAT AREA ================= */}
        <div className={`d-flex flex-column flex-grow-1 h-100 bg-light position-relative ${!selectedUser ? 'd-none d-md-flex' : 'd-flex'}`}>
          {selectedUser ? (
            <>
              {/* Chat Header */}
              <div className="chat-header p-3 px-4 bg-white border-bottom shadow-sm d-flex align-items-center justify-content-between z-1">
                <div className="d-flex align-items-center gap-3">
                  <Button variant="light" className="rounded-circle d-md-none border-0 shadow-sm" onClick={() => setSelectedUser(null)}>
                    <FiChevronLeft size={22} />
                  </Button>
                  
                  <div className="d-flex align-items-center gap-3 cursor-pointer" onClick={() => setShowProfileInfo(true)}>
                    <div className="position-relative">
                      {selectedUser.photoURL ? (
                        <img src={selectedUser.photoURL} alt="" className="avatar-sm border shadow-sm rounded-circle" />
                      ) : (
                        <div className="avatar-sm-initials bg-primary text-white shadow-sm rounded-circle">{selectedUser.name?.charAt(0).toUpperCase()}</div>
                      )}
                      <div className="status-dot-header"></div>
                    </div>
                    <div>
                      <h6 className="fw-bold m-0 text-dark lh-1">{selectedUser.name}</h6>
                      {remoteTyping ? (
                        <small className="text-primary fw-bold animate-pulse" style={{fontSize:'0.75rem'}}>typing...</small>
                      ) : (
                         <small className="text-muted" style={{fontSize:'0.75rem'}}>{selectedUser.role} • {selectedUser.branch}</small>
                      )}
                    </div>
                  </div>
                </div>
                <div className="d-flex align-items-center gap-2">
                  {userRole === 'Admin' && (
                    <Button variant="outline-danger" size="sm" className="rounded-circle border-0 p-2 hover-bg-danger-light" onClick={() => setShowDeleteModal(true)} title="Clear Chat">
                      <FiTrash2 size={18} />
                    </Button>
                  )}
                  <Button variant="light" size="sm" className="rounded-circle border-0 text-dark shadow-sm p-2 hover-bg-light" onClick={() => setShowProfileInfo(true)}>
                    <FiMoreVertical size={20} />
                  </Button>
                </div>
              </div>

              {/* Messages Body */}
              <div className="messages-area flex-grow-1 p-3 p-md-4 overflow-auto custom-scrollbar" style={{ backgroundImage: 'linear-gradient(to top, #f3f4f6, #fff)' }}>
                {messages.map((m, index) => {
                  const isMe = m.senderId === currentUser.uid;
                  const prevM = messages[index - 1];
                  const showDate = !prevM || !isToday(m.timestamp?.toDate()) && (prevM.timestamp?.toDate().toDateString() !== m.timestamp?.toDate().toDateString());

                  return (
                    <React.Fragment key={m.id}>
                        {/* Date Separator */}
                        {m.timestamp && showDate && renderDateSeparator(m.timestamp.toDate())}

                        <div className={`d-flex mb-2 ${isMe ? 'justify-content-end' : 'justify-content-start'}`}>
                          {!isMe && (
                             <div className="me-2 align-self-end mb-1">
                                {selectedUser.photoURL ? <img src={selectedUser.photoURL} className="avatar-xs rounded-circle shadow-sm"/> : <div className="avatar-xs-init bg-secondary text-white rounded-circle">{selectedUser.name[0]}</div>}
                             </div>
                          )}
                          <div className={`message-bubble shadow-sm ${isMe ? 'my-msg' : 'other-msg'}`}>
                            {m.fileUrl && (
                              <div className={`file-card p-2 rounded-3 mb-2 border d-flex align-items-center gap-2 ${isMe ? 'bg-white text-dark' : 'bg-light'}`}>
                                <div className="p-2 rounded bg-light-subtle">
                                   {m.fileCategory === 'image' ? <FiImage className="text-primary" /> : <FiFileText className="text-danger" />}
                                </div>
                                <div className="overflow-hidden flex-grow-1">
                                    <span className="text-truncate small fw-bold d-block" style={{maxWidth:'140px'}}>{m.fileName}</span>
                                    <span className="text-primary small cursor-pointer fw-bold" onClick={() => downloadFile(m.fileUrl)}>Download</span>
                                </div>
                              </div>
                            )}
                            <div className="msg-text" style={{whiteSpace: 'pre-wrap'}}>{m.text}</div>
                            <div className={`msg-time d-flex align-items-center justify-content-end mt-1 ${isMe ? 'text-white-50' : 'text-muted'}`}>
                              {m.timestamp ? format(m.timestamp.toDate(), 'hh:mm a') : '...'}
                              {isMe && (m.read ? <FiCheckCircle size={12} className="ms-1 text-info" /> : <FiCheck size={12} className="ms-1" />)}
                            </div>
                          </div>
                        </div>
                    </React.Fragment>
                  );
                })}
                <div ref={scrollRef} />
              </div>

              {/* Chat Input */}
              <div className="p-3 bg-white border-top z-1 shadow-lg-top">
                {selectedFile && (
                  <div className="d-flex align-items-center justify-content-between p-2 mb-2 bg-primary bg-opacity-10 rounded-3 border border-primary border-opacity-25 animate-slide-up">
                    <div className="d-flex align-items-center gap-2 overflow-hidden px-2">
                      {previewUrl ? <img src={previewUrl} style={{width:'32px', height:'32px', borderRadius:'6px', objectFit:'cover'}} alt="preview"/> : <FiFileText className="text-primary" />}
                      <small className="text-truncate fw-bold text-primary">{selectedFile.name}</small>
                    </div>
                    <Button variant="link" className="text-danger p-0" onClick={() => {setSelectedFile(null); setPreviewUrl(null);}}>
                      <FiX size={18} />
                    </Button>
                  </div>
                )}
                <Form onSubmit={handleSendMessage} className="d-flex align-items-end gap-2">
                  <input type="file" ref={fileInputRef} hidden onChange={handleFileChange} accept="image/*,.pdf,.doc,.docx" />
                  <Button variant="light" className="rounded-circle border-0 bg-light text-secondary mb-1 hover-bg-gray" onClick={() => fileInputRef.current.click()} title="Attach File">
                    <FiImage size={22} />
                  </Button>
                  <Form.Control 
                    as="textarea"
                    rows={1}
                    className="rounded-4 border-0 bg-light px-3 py-2 no-focus shadow-none flex-grow-1 custom-chat-input" 
                    placeholder="Type a message..." 
                    value={messageText} 
                    onChange={handleInputChange} 
                    style={{resize: 'none', minHeight: '44px', maxHeight:'120px'}}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(e); } }}
                  />
                  <Button 
                    type="submit" 
                    variant="primary" 
                    className="rounded-circle shadow-md d-flex align-items-center justify-content-center flex-shrink-0 mb-1 btn-gradient" 
                    style={{ width: '44px', height: '44px' }}
                    disabled={!messageText.trim() && !selectedFile}
                  >
                    {sendingFile ? <Spinner size="sm" /> : <FiSend size={18} className="ms-1"/>}
                  </Button>
                </Form>
              </div>
            </>
          ) : (
            <div className="h-100 d-flex flex-column align-items-center justify-content-center bg-white text-center p-4">
              <div className="p-4 bg-primary bg-opacity-10 rounded-circle mb-4 animate-bounce-soft">
                <FiMessageSquare size={60} className="text-primary" />
              </div>
              <h4 className="fw-bold text-dark mb-2">Happinest Team Chat</h4>
              <p className="text-muted small mb-0" style={{maxWidth: '300px'}}>
                Select a colleague from the list to start collaborating instantly. Safe & Secure.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 🔥 PRO PROFILE INFO OFFCANVAS */}
      <Offcanvas show={showProfileInfo} onHide={() => setShowProfileInfo(false)} placement="end" className="border-0 shadow-lg" style={{ width: '380px' }}>
        <Offcanvas.Header closeButton className="border-bottom bg-white sticky-top">
          <Offcanvas.Title className="fw-bold fs-5">Contact Info</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body className="p-0 bg-white custom-scrollbar">
          {selectedUser && (
            <div>
                {/* Profile Banner */}
                <div className="position-relative mb-5" style={{ height: '140px', background: 'linear-gradient(135deg, #0f172a 0%, #334155 100%)' }}>
                   <div className="position-absolute shadow-lg bg-white p-1 rounded-circle" style={{ bottom: '-50px', left: '50%', transform: 'translateX(-50%)' }}>
                      {selectedUser.photoURL ? (
                        <img src={selectedUser.photoURL} alt="" className="rounded-circle" style={{width:'100px', height:'100px', objectFit:'cover'}} />
                      ) : (
                        <div className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center fw-bold fs-1" style={{width:'100px', height:'100px'}}>{selectedUser.name?.charAt(0).toUpperCase()}</div>
                      )}
                   </div>
                </div>

                {/* Name & Role */}
                <div className="px-4 py-2 text-center mt-5 mb-4">
                    <h4 className="fw-bold text-dark mb-1">{selectedUser.name}</h4>
                    <div className="d-flex justify-content-center gap-2 mt-2">
                       <Badge bg="info" className="px-3 py-2 fw-normal rounded-pill bg-opacity-10 text-info border border-info">{selectedUser.role || 'Staff'}</Badge>
                       <Badge bg="secondary" className="px-3 py-2 fw-normal rounded-pill bg-opacity-10 text-dark border">{selectedUser.branch || 'Global'}</Badge>
                    </div>
                </div>

                {/* Details List */}
                <div className="px-4 pb-4">
                    <h6 className="text-muted small fw-bold mb-3 text-uppercase ls-1">Contact Details</h6>
                    
                    <div className="d-flex align-items-center gap-3 mb-4 p-3 bg-light rounded-4">
                        <div className="bg-white p-2 rounded-circle text-primary shadow-sm"><FiMail size={18}/></div>
                        <div className="overflow-hidden">
                            <small className="text-muted d-block" style={{fontSize:'0.7rem'}}>EMAIL ADDRESS</small>
                            <span className="fw-bold text-dark text-break">{selectedUser.email || 'N/A'}</span>
                        </div>
                    </div>

                    <div className="d-flex align-items-center gap-3 mb-4 p-3 bg-light rounded-4">
                        <div className="bg-white p-2 rounded-circle text-success shadow-sm"><FiPhone size={18}/></div>
                        <div>
                            <small className="text-muted d-block" style={{fontSize:'0.7rem'}}>PHONE</small>
                            <span className="fw-bold text-dark">{selectedUser.phone || 'Not Provided'}</span>
                        </div>
                    </div>

                    <div className="d-flex align-items-center gap-3 mb-4 p-3 bg-light rounded-4">
                        <div className="bg-white p-2 rounded-circle text-warning shadow-sm"><FiMapPin size={18}/></div>
                        <div>
                            <small className="text-muted d-block" style={{fontSize:'0.7rem'}}>LOCATION / BRANCH</small>
                            <span className="fw-bold text-dark">{selectedUser.branch || 'Head Office'}</span>
                        </div>
                    </div>

                    {selectedUser.bio && (
                        <div className="p-3 bg-light rounded-4">
                            <div className="d-flex align-items-center gap-2 mb-2 text-primary">
                               <FiInfo/> <span className="fw-bold small">About</span>
                            </div>
                            <p className="text-muted small mb-0 fst-italic">"{selectedUser.bio}"</p>
                        </div>
                    )}
                </div>
            </div>
          )}
        </Offcanvas.Body>
      </Offcanvas>

      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered size="sm">
        <Modal.Body className="text-center p-4">
          <div className="bg-danger bg-opacity-10 text-danger rounded-circle p-3 d-inline-block mb-3"><FiTrash2 size={24} /></div>
          <h6 className="fw-bold">Clear Conversation?</h6>
          <p className="text-muted small">This action cannot be undone.</p>
          <div className="d-flex gap-2 mt-4">
            <Button variant="light" className="w-50 rounded-pill btn-sm" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
            <Button variant="danger" className="w-50 rounded-pill btn-sm" onClick={handleClearChat} disabled={isDeleting}>Clear All</Button>
          </div>
        </Modal.Body>
      </Modal>

      {/* Embedded Styles */}
      <style>{`
        .user-item { border: 1px solid transparent; }
        .hover-bg-light:hover { background-color: #f8fafc; }
        .active-user { background: #eff6ff !important; border-color: #dbeafe !important; }
        .avatar, .avatar-initials { width: 48px; height: 48px; border-radius: 14px; object-fit: cover; }
        .avatar-initials { display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 1.1rem; }
        .status-indicator { position: absolute; bottom: -2px; right: -2px; width: 12px; height: 12px; border-radius: 50%; border: 2px solid #fff; background: #10b981; }
        
        .avatar-sm, .avatar-sm-initials { width: 40px; height: 40px; object-fit: cover; }
        .avatar-sm-initials { display: flex; align-items: center; justify-content: center; font-weight: bold; }
        .status-dot-header { position: absolute; bottom: 0; right: 0; width: 10px; height: 10px; background: #10b981; border: 2px solid white; border-radius: 50%; }

        .message-bubble { padding: 12px 18px; border-radius: 20px; max-width: 75%; font-size: 0.95rem; line-height: 1.5; position: relative; }
        .my-msg { background: #2563eb; color: white; border-bottom-right-radius: 4px; box-shadow: 0 4px 10px rgba(37, 99, 235, 0.2) !important; }
        .other-msg { background: white; color: #1e293b; border: 1px solid #e2e8f0; border-bottom-left-radius: 4px; }
        
        .avatar-xs { width: 28px; height: 28px; object-fit: cover; }
        .avatar-xs-init { width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; font-weight: bold; }

        .bg-gradient-primary { background: linear-gradient(135deg, #3b82f6, #2563eb); }
        .btn-gradient { background: linear-gradient(135deg, #3b82f6, #2563eb); border: none; }
        .custom-chat-input { transition: all 0.2s; }
        .custom-chat-input:focus { background: white; box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1) !important; }
        
        .shadow-lg-top { box-shadow: 0 -4px 20px rgba(0,0,0,0.05); }
        .animate-slide-up { animation: slideUp 0.3s ease-out; }
        @keyframes slideUp { from { transform: translateY(10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>
    </div>
  );
};

export default ChatPage;