public without sharing class TextSyncController {

    @AuraEnabled
    public static Map<String, Object> getText(String password) {

        Map<String, Object> result = new Map<String, Object>();

        if (String.isBlank(password)) {
            result.put('status', 'EMPTY');
            return result;
        }

        List<Shared_Text__c> records = [
            SELECT Content__c, Content_2__c, Content_3__c
            FROM Shared_Text__c 
            WHERE Password__c = :password
            LIMIT 1
        ];

        if (records.isEmpty()) {
            result.put('status', 'NEW');
        } else {
            Shared_Text__c rec = records[0];

            // 🔗 Join all parts (IMPORTANT)
            String fullContent =
                (rec.Content__c != null ? rec.Content__c : '') +
                (rec.Content_2__c != null ? rec.Content_2__c : '') +
                (rec.Content_3__c != null ? rec.Content_3__c : '');

            result.put('status', 'EXISTING');
            result.put('content', fullContent);
        }

        return result;
    }

    @AuraEnabled
    public static void saveText(String content, String password) {

        if (String.isBlank(password)) {
            throw new AuraHandledException('Password required');
        }

        Integer chunkSize = 30000;

        // 🔪 Split content safely
        String part1 = content.length() > 0 
            ? content.substring(0, Math.min(chunkSize, content.length())) 
            : '';

        String part2 = content.length() > chunkSize 
            ? content.substring(chunkSize, Math.min(chunkSize * 2, content.length())) 
            : '';

        String part3 = content.length() > chunkSize * 2 
            ? content.substring(chunkSize * 2, Math.min(chunkSize * 3, content.length())) 
            : '';

        Shared_Text__c record;

        List<Shared_Text__c> existing = [
            SELECT Id 
            FROM Shared_Text__c 
            WHERE Password__c = :password
            LIMIT 1
        ];

        if (!existing.isEmpty()) {
            record = existing[0];
        } else {
            record = new Shared_Text__c(
                Name = 'Guest Record',
                Password__c = password
            );
        }

        // ✅ Save into all fields
        record.Content__c   = part1;
        record.Content_2__c = part2;
        record.Content_3__c = part3;

        if (record.Id != null) {
            update record;
        } else {
            insert record;
        }
    }
}