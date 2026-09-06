package com.flyhigh.backend.dto;

import java.util.List;

/**
 * Paginated response for client payment history queries.
 */
public class ClientPaymentHistoryPage {

    private List<ClientPaymentHistoryDto> content;
    private long totalElements;
    private int totalPages;
    private int page;

    public ClientPaymentHistoryPage() {}

    public ClientPaymentHistoryPage(List<ClientPaymentHistoryDto> content, long totalElements,
                                    int totalPages, int page) {
        this.content = content;
        this.totalElements = totalElements;
        this.totalPages = totalPages;
        this.page = page;
    }

    public List<ClientPaymentHistoryDto> getContent() { return content; }
    public void setContent(List<ClientPaymentHistoryDto> content) { this.content = content; }

    public long getTotalElements() { return totalElements; }
    public void setTotalElements(long totalElements) { this.totalElements = totalElements; }

    public int getTotalPages() { return totalPages; }
    public void setTotalPages(int totalPages) { this.totalPages = totalPages; }

    public int getPage() { return page; }
    public void setPage(int page) { this.page = page; }
}
