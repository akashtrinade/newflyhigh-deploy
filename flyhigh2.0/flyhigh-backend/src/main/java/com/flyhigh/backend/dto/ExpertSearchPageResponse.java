package com.flyhigh.backend.dto;

import java.util.List;

/**
 * Paginated wrapper for expert search results.
 */
public class ExpertSearchPageResponse {
    private List<ExpertSummaryResponse> experts;
    private long totalElements;
    private int totalPages;
    private int currentPage;
    private int pageSize;

    public ExpertSearchPageResponse() {}

    public ExpertSearchPageResponse(List<ExpertSummaryResponse> experts, long totalElements,
                                    int totalPages, int currentPage, int pageSize) {
        this.experts = experts;
        this.totalElements = totalElements;
        this.totalPages = totalPages;
        this.currentPage = currentPage;
        this.pageSize = pageSize;
    }

    public List<ExpertSummaryResponse> getExperts() { return experts; }
    public void setExperts(List<ExpertSummaryResponse> experts) { this.experts = experts; }

    public long getTotalElements() { return totalElements; }
    public void setTotalElements(long totalElements) { this.totalElements = totalElements; }

    public int getTotalPages() { return totalPages; }
    public void setTotalPages(int totalPages) { this.totalPages = totalPages; }

    public int getCurrentPage() { return currentPage; }
    public void setCurrentPage(int currentPage) { this.currentPage = currentPage; }

    public int getPageSize() { return pageSize; }
    public void setPageSize(int pageSize) { this.pageSize = pageSize; }
}
