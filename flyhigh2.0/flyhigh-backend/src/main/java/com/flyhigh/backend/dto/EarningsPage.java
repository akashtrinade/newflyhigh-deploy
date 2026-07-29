package com.flyhigh.backend.dto;

import java.util.List;

/**
 * Paginated response for earnings history queries.
 */
public class EarningsPage {

    private List<ExpertEarningResponse> earnings;
    private long totalElements;
    private int totalPages;
    private int currentPage;
    private int pageSize;

    public EarningsPage() {}

    public EarningsPage(List<ExpertEarningResponse> earnings, long totalElements,
                        int totalPages, int currentPage, int pageSize) {
        this.earnings = earnings;
        this.totalElements = totalElements;
        this.totalPages = totalPages;
        this.currentPage = currentPage;
        this.pageSize = pageSize;
    }

    public List<ExpertEarningResponse> getEarnings() { return earnings; }
    public void setEarnings(List<ExpertEarningResponse> earnings) { this.earnings = earnings; }

    public long getTotalElements() { return totalElements; }
    public void setTotalElements(long totalElements) { this.totalElements = totalElements; }

    public int getTotalPages() { return totalPages; }
    public void setTotalPages(int totalPages) { this.totalPages = totalPages; }

    public int getCurrentPage() { return currentPage; }
    public void setCurrentPage(int currentPage) { this.currentPage = currentPage; }

    public int getPageSize() { return pageSize; }
    public void setPageSize(int pageSize) { this.pageSize = pageSize; }
}
