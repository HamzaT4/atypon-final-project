package com.collabcode.server.controller;

import com.collabcode.server.config.CustomOAuth2AuthenticationSuccessHandler;
import com.collabcode.server.entity.User;
import com.collabcode.server.service.UserService;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.collabcode.server.config.SecurityConfig;

@WebMvcTest(UserController.class)
@Import(SecurityConfig.class)  
public class UserControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private UserService userService;

    
    @MockBean
    private CustomOAuth2AuthenticationSuccessHandler customOAuth2AuthenticationSuccessHandler;

    @Test
    @WithMockUser 
    public void testGetUserById() throws Exception {
        User mockUser = new User();
        mockUser.setId("123");
        mockUser.setUsername("hamza");
        mockUser.setEmail("hamza@example.com");

        Mockito.when(userService.getById("123")).thenReturn(mockUser);

        mockMvc.perform(get("/api/users/123"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("hamza"))
                .andExpect(jsonPath("$.email").value("hamza@example.com"));
    }
}
