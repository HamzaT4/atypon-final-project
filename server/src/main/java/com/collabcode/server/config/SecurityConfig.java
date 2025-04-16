package com.collabcode.server.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Autowired
    private CustomOAuth2AuthenticationSuccessHandler customOAuth2AuthenticationSuccessHandler;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
          .csrf(csrf -> csrf.disable())
          .authorizeHttpRequests(auth -> auth
              .requestMatchers("/api/public/**").permitAll()
              .anyRequest().authenticated()
          )
          .oauth2Login(oauth2 -> oauth2
              .successHandler(customOAuth2AuthenticationSuccessHandler)
          )
          .logout(logout -> logout
              .logoutSuccessUrl("/")
              .invalidateHttpSession(true)
              .deleteCookies("JSESSIONID")
              .permitAll()
          );
        return http.build();
    }
}
