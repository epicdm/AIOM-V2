# PowerShell script to test AI COO Dashboard API endpoints
Write-Host "🧪 Testing AI COO Dashboard API Endpoints..." -ForegroundColor Cyan
Write-Host ""

function Test-Endpoint {
    param($Url, $Name)
    try {
        $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -ErrorAction Stop
        Write-Host "✅ $Name" -ForegroundColor Green
        Write-Host "   Status: $($response.StatusCode)" -ForegroundColor Gray
        $json = $response.Content | ConvertFrom-Json
        Write-Host "   Keys: $($json.PSObject.Properties.Name -join ', ')" -ForegroundColor Gray

        # Show sample data structure
        if ($json.recommendations) {
            Write-Host "   Recommendations count: $($json.recommendations.Count)" -ForegroundColor Gray
        }
        if ($json.happening_now) {
            Write-Host "   Happening now: $($json.happening_now.Count), Upcoming: $($json.upcoming.Count), Recent: $($json.recent.Count)" -ForegroundColor Gray
        }
        if ($json.metrics) {
            Write-Host "   Metrics available: actionsCompleted, automated, successRate, etc." -ForegroundColor Gray
        }
        Write-Host ""
    } catch {
        Write-Host "❌ $Name" -ForegroundColor Red
        Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host ""
    }
}

# Test all three endpoints
Test-Endpoint "http://localhost:3000/api/ai-coo/action-recommendations?status=pending_approval&limit=10" "Action Recommendations"
Test-Endpoint "http://localhost:3000/api/ai-coo/activity-feed" "Activity Feed"
Test-Endpoint "http://localhost:3000/api/ai-coo/daily-metrics" "Daily Metrics"

Write-Host "✅ API endpoint tests complete!" -ForegroundColor Cyan
Write-Host ""
Write-Host "💡 Next: Open http://localhost:3000/dashboard/ai-coo in your browser" -ForegroundColor Yellow
