package com.collabcode.server.controller;

import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Controller
public class FileEditWebSocketController {

    private final SimpMessagingTemplate messagingTemplate;

    private final Map<String, Set<String>> activeEditors = new ConcurrentHashMap<>();

    public FileEditWebSocketController(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    @MessageMapping("/edit")
    public void handleEditMessage(@Payload EditMessage message) {
        if ("EDIT".equals(message.getType()) || "SUBSCRIBE".equals(message.getType())) {
            activeEditors.computeIfAbsent(message.getFileId(), k -> ConcurrentHashMap.newKeySet()).add(message.getUserId());

            if (!message.isSender) {
                messagingTemplate.convertAndSend("/topic/edit/" + message.getFileId(), message);
            }

        } else if ("REFRESH".equals(message.getType())) {
            messagingTemplate.convertAndSend("/topic/edit/" + message.getFileId(), message);
        }
    }

    public static class EditMessage {
        private String type;
        private String fileId;
        private String userId;
        private String text;
        private int start;
        private int end;
        private String timestamp;
        private boolean isSender;

        public String getType() { return type; }
        public void setType(String type) { this.type = type; }

        public String getFileId() { return fileId; }
        public void setFileId(String fileId) { this.fileId = fileId; }

        public String getUserId() { return userId; }
        public void setUserId(String userId) { this.userId = userId; }

        public String getText() { return text; }
        public void setText(String text) { this.text = text; }

        public int getStart() { return start; }
        public void setStart(int start) { this.start = start; }

        public int getEnd() { return end; }
        public void setEnd(int end) { this.end = end; }

        public String getTimestamp() { return timestamp; }
        public void setTimestamp(String timestamp) { this.timestamp = timestamp; }

        public boolean isSender() { return isSender; }
        public void setSender(boolean isSender) { this.isSender = isSender; }
    }
}
